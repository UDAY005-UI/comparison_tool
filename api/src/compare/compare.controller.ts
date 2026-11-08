import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CompareService } from './compare.service';

interface UploadedFilesMap {
  fileA?: Express.Multer.File[];
  fileB?: Express.Multer.File[];
}

@Controller('compare')
export class CompareController {
  constructor(private readonly service: CompareService) {}

  @Post('session')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'fileA', maxCount: 1 },
      { name: 'fileB', maxCount: 1 },
    ]),
  )
  createSession(
    @UploadedFiles() files: UploadedFilesMap,
    @Body()
    body: {
      basis: string;
      keyA: string;
      keyB: string;
      headerA: string;
      headerB: string;
    },
  ) {
    const fileA = files?.fileA?.[0];
    const fileB = files?.fileB?.[0];
    if (!fileA || !fileB) {
      throw new BadRequestException('Both files are required');
    }
    if (body.basis !== 'row' && body.basis !== 'column') {
      throw new BadRequestException('basis must be "row" or "column"');
    }

    return this.service.createSession(
      fileA.buffer,
      fileB.buffer,
      body.basis,
      Number(body.keyA),
      Number(body.keyB),
      Number(body.headerA),
      Number(body.headerB),
    );
  }

  @Post('run')
  run(@Body() body: { sessionId: string; colA: number; colB: number }) {
    if (!body?.sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    return this.service.run(
      body.sessionId,
      Number(body.colA),
      Number(body.colB),
    );
  }

  @Post('run-range')
  runRange(
    @Body()
    body: {
      sessionId: string;
      startA: number;
      endA: number;
      startB: number;
      endB: number;
    },
  ) {
    if (!body?.sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    return this.service.runRange(
      body.sessionId,
      Number(body.startA),
      Number(body.endA),
      Number(body.startB),
      Number(body.endB),
    );
  }
}
