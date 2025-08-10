import { Module, Global } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { SessionUser } from './entities/session-user.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Session, SessionUser])
  ],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService]
})
export class SessionModule {}