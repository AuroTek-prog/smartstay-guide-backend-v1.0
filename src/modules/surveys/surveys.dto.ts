import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSurveyResponseDto {
  @ApiProperty({ description: 'Survey ID', example: '11111111-1111-1111-1111-111111111111' })
  @IsString()
  @IsNotEmpty()
  surveyId: string;

  @ApiProperty({ description: 'Unit ID', example: '22222222-2222-2222-2222-222222222222' })
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @ApiProperty({
    description: 'Survey answers as JSON object',
    example: { q1: 5, q2: 'Great location', q3: true },
  })
  @IsObject()
  @IsNotEmpty()
  answers: any;
}
