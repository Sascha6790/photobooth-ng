import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpStatus,
  UseGuards,
  Req
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiQuery,
  ApiBearerAuth 
} from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { Request } from 'express';

@ApiTags('Sessions')
@Controller('api/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Session created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Session ID already exists' })
  async createSession(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionService.createSession(createSessionDto);
  }

  @Post(':sessionId/join')
  @ApiOperation({ summary: 'Join an existing session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to join' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Successfully joined session' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Session is full or inactive' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async joinSession(
    @Param('sessionId') sessionId: string,
    @Body() joinSessionDto: JoinSessionDto,
    @Req() req: Request
  ) {
    // Extract IP from request if not provided
    if (!joinSessionDto.ipAddress) {
      joinSessionDto.ipAddress = req.ip || req.connection.remoteAddress;
    }
    if (!joinSessionDto.userAgent) {
      joinSessionDto.userAgent = req.headers['user-agent'];
    }
    
    return this.sessionService.joinSession(sessionId, joinSessionDto);
  }

  @Post(':sessionId/leave')
  @ApiOperation({ summary: 'Leave a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to leave' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Successfully left session' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session or user not found' })
  async leaveSession(
    @Param('sessionId') sessionId: string,
    @Body('userId') userId: string
  ) {
    await this.sessionService.leaveSession(sessionId, userId);
    return { message: 'Successfully left session' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of active sessions' })
  async getActiveSessions() {
    return this.sessionService.getActiveSessions();
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get session details' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.sessionService.findSessionById(sessionId);
  }

  @Get(':sessionId/users')
  @ApiOperation({ summary: 'Get session users' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiQuery({ name: 'onlineOnly', required: false, type: Boolean })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of session users' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async getSessionUsers(
    @Param('sessionId') sessionId: string,
    @Query('onlineOnly') onlineOnly?: boolean
  ) {
    return this.sessionService.getSessionUsers(sessionId, onlineOnly);
  }

  @Get(':sessionId/statistics')
  @ApiOperation({ summary: 'Get session statistics' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session statistics' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async getSessionStatistics(@Param('sessionId') sessionId: string) {
    return this.sessionService.getSessionStatistics(sessionId);
  }

  @Put(':sessionId')
  @ApiOperation({ summary: 'Update session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async updateSession(
    @Param('sessionId') sessionId: string,
    @Body() updateSessionDto: UpdateSessionDto
  ) {
    return this.sessionService.updateSession(sessionId, updateSessionDto);
  }

  @Post(':sessionId/activity')
  @ApiOperation({ summary: 'Update user activity in session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Activity updated' })
  async updateActivity(
    @Param('sessionId') sessionId: string,
    @Body() body: { userId: string; activityData?: any }
  ) {
    await this.sessionService.updateUserActivity(sessionId, body.userId, body.activityData);
    return { message: 'Activity updated' };
  }

  @Post(':sessionId/capture')
  @ApiOperation({ summary: 'Add captured image to session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Image added to session' })
  async addCapturedImage(
    @Param('sessionId') sessionId: string,
    @Body('imageId') imageId: string
  ) {
    await this.sessionService.addCapturedImage(sessionId, imageId);
    return { message: 'Image added to session' };
  }

  @Post(':sessionId/end')
  @ApiOperation({ summary: 'End a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session ended successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async endSession(@Param('sessionId') sessionId: string) {
    return this.sessionService.endSession(sessionId);
  }

  @Post(':sessionId/pause')
  @ApiOperation({ summary: 'Pause a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session paused successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async pauseSession(@Param('sessionId') sessionId: string) {
    return this.sessionService.pauseSession(sessionId, true);
  }

  @Post(':sessionId/resume')
  @ApiOperation({ summary: 'Resume a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session resumed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  async resumeSession(@Param('sessionId') sessionId: string) {
    return this.sessionService.pauseSession(sessionId, false);
  }
}