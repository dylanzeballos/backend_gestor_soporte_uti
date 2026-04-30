import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class FilesService {
  constructor(private readonly configService: ConfigService) {}

  getMediaRootPath() {
    const mediaPath = this.configService.get<string>('MEDIA_PATH') ?? 'media';
    return join(process.cwd(), mediaPath);
  }

  getAttachmentPublicUrl(ticketId: number, filename: string) {
    return `/media/tickets/${ticketId}/${filename}`;
  }

  resolveAttachmentAbsolutePath(ticketId: number, filename: string) {
    const safeName = filename.replace(/[\\/]/g, '');
    const path = join(this.getMediaRootPath(), 'tickets', `${ticketId}`, safeName);

    if (!existsSync(path)) {
      throw new NotFoundException('Attachment not found');
    }

    return path;
  }
}
