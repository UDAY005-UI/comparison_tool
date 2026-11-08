import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';

export type Basis = 'row' | 'column';

interface Session {
    basis: Basis;
    keyA: number;
    keyB: number;
    headerA: number;
    headerB: number;
    a: string[][];
    b: string[][];
    createdAt: number;
}

export interface Mismatch {
    key: string;
    valueA: string;
    serialA: number;
    valueB: string;
    serialB: number;
}

export interface CompareOutput {
    allMatched: boolean;
    message: string;
    labelA: string;
    labelB: string;
    compared: number;
    mismatches: Mismatch[];
    missingInB: { key: string; serialA: number }[];
    missingInA: { key: string; serialB: number }[];
}

export interface RangeItem {
    colA: number;
    colB: number;
    output: CompareOutput;
}

const TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CompareService {
    private sessions = new Map<string, Session>();

    private load(buf: Buffer, basis: Basis): string[][] {
        const wb = XLSX.read(buf, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) throw new BadRequestException('Workbook has no sheets');

        const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
            header: 1,
            defval: '',
            raw: false,
        });
        const matrix = rows.map((r) => r.map((c) => String(c ?? '').trim()));
        if (basis === 'column') return matrix;

        const width = matrix.reduce((m, r) => Math.max(m, r.length), 0);
        return Array.from({ length: width }, (_, c) =>
            matrix.map((r) => r[c] ?? ''),
        );
    }

    private width(m: string[][]): number {
        return m.reduce((max, r) => Math.max(max, r.length), 0);
    }

    private check(n: number, max: number, label: string) {
        if (!Number.isInteger(n) || n < 1 || n > max) {
            throw new BadRequestException(
                `${label} must be a whole number between 1 and ${max}`,
            );
        }
    }

    private cleanup() {
        const now = Date.now();
        for (const [id, s] of this.sessions) {
            if (now - s.createdAt > TTL_MS) this.sessions.delete(id);
        }
    }

    createSession(
        fileA: Buffer,
        fileB: Buffer,
        basis: Basis,
        keyA: number,
        keyB: number,
        headerA: number,
        headerB: number,
    ) {
        this.cleanup();

        const a = this.load(fileA, basis);
        const b = this.load(fileB, basis);
        const unit = basis === 'column' ? 'column' : 'row';
        const headerUnit = basis === 'column' ? 'row' : 'column';

        this.check(keyA, this.width(a), `File A key ${unit}`);
        this.check(keyB, this.width(b), `File B key ${unit}`);
        this.check(headerA, a.length, `File A heading ${headerUnit}`);
        this.check(headerB, b.length, `File B heading ${headerUnit}`);

        const sessionId = randomUUID();
        this.sessions.set(sessionId, {
            basis,
            keyA,
            keyB,
            headerA,
            headerB,
            a,
            b,
            createdAt: Date.now(),
        });

        return {
            sessionId,
            basis,
            maxA: this.width(a),
            maxB: this.width(b),
            keyLabelA: a[headerA - 1]?.[keyA - 1] ?? '',
            keyLabelB: b[headerB - 1]?.[keyB - 1] ?? '',
        };
    }

    run(sessionId: string, colA: number, colB: number): CompareOutput {
        this.cleanup();

        const s = this.sessions.get(sessionId);
        if (!s)
            throw new NotFoundException('Session expired. Upload the files again.');

        const unit = s.basis === 'column' ? 'column' : 'row';
        this.check(colA, this.width(s.a), `File A ${unit}`);
        this.check(colB, this.width(s.b), `File B ${unit}`);

        const norm = (v: string) => v.trim().toLowerCase();

        const mapB = new Map<string, number>();
        for (let i = s.headerB; i < s.b.length; i++) {
            const k = norm(s.b[i][s.keyB - 1] ?? '');
            if (k && !mapB.has(k)) mapB.set(k, i);
        }

        const seen = new Set<string>();
        const mismatches: Mismatch[] = [];
        const missingInB: { key: string; serialA: number }[] = [];
        let compared = 0;

        for (let i = s.headerA; i < s.a.length; i++) {
            const rawKey = s.a[i][s.keyA - 1] ?? '';
            const k = norm(rawKey);
            if (!k) continue;

            const j = mapB.get(k);
            if (j === undefined) {
                missingInB.push({ key: rawKey, serialA: i + 1 });
                continue;
            }

            seen.add(k);
            compared++;

            const valueA = s.a[i][colA - 1] ?? '';
            const valueB = s.b[j][colB - 1] ?? '';
            if (valueA !== valueB) {
                mismatches.push({
                    key: rawKey,
                    valueA,
                    serialA: i + 1,
                    valueB,
                    serialB: j + 1,
                });
            }
        }

        const missingInA: { key: string; serialB: number }[] = [];
        for (let j = s.headerB; j < s.b.length; j++) {
            const rawKey = s.b[j][s.keyB - 1] ?? '';
            const k = norm(rawKey);
            if (k && !seen.has(k)) missingInA.push({ key: rawKey, serialB: j + 1 });
        }

        const allMatched = mismatches.length === 0;

        return {
            allMatched,
            message: allMatched
                ? 'Every value matched'
                : `${mismatches.length} value(s) did not match`,
            labelA: s.a[s.headerA - 1]?.[colA - 1] ?? '',
            labelB: s.b[s.headerB - 1]?.[colB - 1] ?? '',
            compared,
            mismatches,
            missingInB,
            missingInA,
        };
    }

    runRange(
        sessionId: string,
        startA: number,
        endA: number,
        startB: number,
        endB: number,
    ): RangeItem[] {
        if (![startA, endA, startB, endB].every((n) => Number.isInteger(n))) {
            throw new BadRequestException('Range values must be whole numbers');
        }
        if (endA < startA || endB < startB) {
            throw new BadRequestException(
                'Range end must not be smaller than range start',
            );
        }
        if (endA - startA !== endB - startB) {
            throw new BadRequestException(
                'Both ranges must cover the same number of items',
            );
        }

        const items: RangeItem[] = [];
        for (let i = 0; i <= endA - startA; i++) {
            const colA = startA + i;
            const colB = startB + i;
            items.push({ colA, colB, output: this.run(sessionId, colA, colB) });
        }
        return items;
    }
}
