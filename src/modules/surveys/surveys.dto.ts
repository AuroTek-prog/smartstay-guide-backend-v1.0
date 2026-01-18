import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSurveyResponseDto {
  @ApiProperty({ description: 'Survey ID' })
  @IsString()
  @IsNotEmpty()
  surveyId: string;

  @ApiProperty({ description: 'Unit ID' })
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @ApiProperty({ description: 'Survey answers as JSON object' })
  @IsObject()
  @IsNotEmpty()
  answers: any;
}
