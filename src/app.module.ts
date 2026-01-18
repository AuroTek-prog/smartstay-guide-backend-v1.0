import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UnitsModule } from './modules/units/units.module';
import { GuidesModule } from './modules/guides/guides.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { FirebaseAuthModule } from './modules/firebase-auth/firebase-auth.module';
import { IoTModule } from './modules/iot/iot.module';
import { BillingModule } from './modules/billing/billing.module';
import { ManagerModule } from './modules/manager/manager.module'; // CHANGE: FASE 5+6 - Gestión de apartamentos + Upload
import { AdminModule } from './modules/admin/admin.module'; // CHANGE: FASE 8 - Panel Admin
import { EmailModule } from './modules/email/email.module'; // CHANGE: FASE 9 - Notificaciones
import { AnalyticsModule } from './modules/analytics/analytics.module'; // CHANGE: FASE 10 - Métricas

@Module({
  imports: [
    PrismaModule,
    CompaniesModule,
    UnitsModule,
    GuidesModule,
    SurveysModule,
    PublicApiModule,
    FirebaseAuthModule,
    IoTModule, // CHANGE: FASE 7 - Multi-Provider IoT
    BillingModule,
    ManagerModule,
    AdminModule, // CHANGE: FASE 8
    EmailModule, // CHANGE: FASE 9
    AnalyticsModule, // CHANGE: FASE 10
  ],
})
export class AppModule {}
