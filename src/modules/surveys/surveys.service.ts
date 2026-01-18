import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateSurveyResponseDto } from './surveys.dto';

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.survey.findMany({
      where: { active: true },
    });
  }

  async getById(id: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return survey;
  }

  async createResponse(dto: CreateSurveyResponseDto) {
    // Verify survey exists
    const survey = await this.getById(dto.surveyId);

    // Verify unit exists
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${dto.unitId} not found`);
    }

    // Create response
    const response = await this.prisma.surveyResponse.create({
      data: {
        surveyId: dto.surveyId,
        unitId: dto.unitId,
        answersJson: dto.answers,
      },
      include: {
        survey: true,
        unit: true,
      },
    });

    // Process answers and generate rules
    await this.processAnswersToRules(response.unitId, dto.answers);

    return response;
  }

  async getUnitResponses(unitId: string) {
    return this.prisma.surveyResponse.findMany({
      where: { unitId },
      include: {
        survey: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async processAnswersToRules(unitId: string, answers: any) {
    // TODO: Implement logic to convert survey answers to unit rules
    // This would map specific answers to specific rules in the database
    // For example:
    // - If "pets_allowed" === true, add "PETS_ALLOWED" rule
    // - If "smoking_allowed" === false, add "NO_SMOKING" rule
    // - etc.
    
    console.log('Processing answers to rules for unit:', unitId, answers);
  }
}
