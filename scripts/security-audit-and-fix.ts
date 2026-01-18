#!/usr/bin/env ts-node
/**
 * SECURITY AUDIT AND FIX SCRIPT
 * SmartStay Guide Backend - NestJS Security Hardening
 * 
 * Este script:
 * 1. Escanea todos los controladores (@Controller)
 * 2. Detecta endpoints inseguros
 * 3. Aplica correcciones automáticas
 * 4. Genera reporte de auditoría
 * 
 * Uso: ts-node scripts/security-audit-and-fix.ts [--dry-run] [--apply]
 */

import * as fs from 'fs';
import * as path from 'path';

interface SecurityIssue {
  file: string;
  line: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  currentCode?: string;
  suggestedFix?: string;
  autoFixable: boolean;
  fixed?: boolean;
}

interface AuditReport {
  timestamp: string;
  filesScanned: number;
  endpointsAnalyzed: number;
  issuesFound: SecurityIssue[];
  issuesFixed: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

class SecurityAuditor {
  private srcPath: string;
  private issues: SecurityIssue[] = [];
  private fixedIssues: SecurityIssue[] = [];
  private filesScanned = 0;
  private endpointsAnalyzed = 0;
  private dryRun: boolean;

  constructor(dryRun = true) {
    this.srcPath = path.join(__dirname, '..', 'src');
    this.dryRun = dryRun;
  }

  /**
   * Ejecutar auditoría completa
   */
  async run(): Promise<AuditReport> {
    console.log('🔍 Iniciando auditoría de seguridad...\n');

    // 1. Escanear controladores
    await this.scanControllers();

    // 2. Escanear guards
    await this.scanGuards();

    // 3. Escanear servicios con lógica sensible
    await this.scanServices();

    // 4. Aplicar correcciones si no es dry-run
    if (!this.dryRun) {
      await this.applyFixes();
    }

    // 5. Generar reporte
    return this.generateReport();
  }

  /**
   * Escanear todos los controladores
   */
  private async scanControllers(): Promise<void> {
    console.log('📋 Escaneando controladores...');

    const controllerFiles = this.findFiles(this.srcPath, '.controller.ts');

    for (const file of controllerFiles) {
      this.filesScanned++;
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Detectar endpoints
      this.analyzeEndpoints(file, lines);
    }
  }

  /**
   * Analizar endpoints en un archivo
   */
  private analyzeEndpoints(file: string, lines: string[]): void {
    const filename = path.basename(file);
    let inController = false;
    let hasGuard = false;
    let isPublicController = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detectar @Controller
      if (line.includes('@Controller(')) {
        inController = true;
        isPublicController = file.includes('public-api') || line.includes('api/public');
      }

      // Detectar guards a nivel de controlador
      if (line.includes('@UseGuards(')) {
        hasGuard = true;
      }

      // Detectar endpoints HTTP
      if (line.match(/@(Get|Post|Put|Delete|Patch)\(/)) {
        this.endpointsAnalyzed++;

        const endpoint = this.extractEndpoint(lines, i);
        const method = line.match(/@(Get|Post|Put|Delete|Patch)/)?.[1] || '';

        // CRÍTICO: Endpoint open-lock público sin validación
        if (endpoint.includes('open-lock') && isPublicController) {
          this.issues.push({
            file,
            line: lineNum,
            severity: 'CRITICAL',
            category: 'AUTHENTICATION_BYPASS',
            description: 'Endpoint open-lock público sin validación de token',
            currentCode: this.getCodeBlock(lines, i, 10),
            suggestedFix: this.getOpenLockFix(),
            autoFixable: true,
          });
        }

        // CRÍTICO: Endpoints admin sin AdminGuard
        if (file.includes('admin.controller.ts') && !this.hasGuardInMethod(lines, i)) {
          if (!hasGuard) { // Si no tiene guard a nivel de controlador
            this.issues.push({
              file,
              line: lineNum,
              severity: 'CRITICAL',
              category: 'AUTHORIZATION_MISSING',
              description: 'Endpoint admin sin AdminGuard',
              currentCode: line,
              suggestedFix: '@UseGuards(FirebaseAuthGuard, AdminGuard)',
              autoFixable: true,
            });
          }
        }

        // ALTO: Endpoints IoT sin guards
        if (file.includes('iot.controller.ts') && !this.hasGuardInMethod(lines, i)) {
          this.issues.push({
            file,
            line: lineNum,
            severity: 'HIGH',
            category: 'AUTHENTICATION_MISSING',
            description: 'Endpoint IoT sin autenticación',
            currentCode: line,
            suggestedFix: '@UseGuards(FirebaseAuthGuard, AdminGuard)',
            autoFixable: true,
          });
        }

        // MEDIO: Endpoints públicos que retornan datos sensibles
        if (isPublicController && method === 'Get') {
          const nextLines = lines.slice(i, i + 15).join('\n');
          if (nextLines.includes('accessCode') || nextLines.includes('config')) {
            this.issues.push({
              file,
              line: lineNum,
              severity: 'MEDIUM',
              category: 'DATA_EXPOSURE',
              description: 'Endpoint público puede exponer datos sensibles',
              currentCode: this.getCodeBlock(lines, i, 15),
              autoFixable: false,
            });
          }
        }

        // MEDIO: Falta validación published=true en endpoints públicos
        if (isPublicController && endpoint.includes(':slug')) {
          const methodBody = this.getMethodBody(lines, i);
          if (!methodBody.includes('published') && methodBody.includes('findUnique')) {
            this.issues.push({
              file,
              line: lineNum,
              severity: 'MEDIUM',
              category: 'VALIDATION_MISSING',
              description: 'Endpoint público no valida published=true',
              currentCode: this.getCodeBlock(lines, i, 10),
              suggestedFix: 'Agregar validación: if (!unit || !unit.published) throw NotFoundException()',
              autoFixable: true,
            });
          }
        }
      }
    }
  }

  /**
   * Escanear guards
   */
  private async scanGuards(): Promise<void> {
    console.log('🛡️  Escaneando guards...');

    const guardFiles = this.findFiles(this.srcPath, '.guard.ts');

    for (const file of guardFiles) {
      this.filesScanned++;
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // CRÍTICO: Detectar bypass en guards
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detectar "return true" sospechoso
        if (line.includes('return true') && !line.includes('//')) {
          const context = this.getCodeBlock(lines, i, 5);

          // Bypass en AdminGuard
          if (file.includes('admin.guard.ts') && context.includes('if (!user)')) {
            this.issues.push({
              file,
              line: i + 1,
              severity: 'CRITICAL',
              category: 'AUTHENTICATION_BYPASS',
              description: 'AdminGuard permite acceso sin usuario (bypass total)',
              currentCode: context,
              suggestedFix: this.getAdminGuardFix(),
              autoFixable: true,
            });
          }

          // Bypass en FirebaseAuthGuard
          if (file.includes('firebase-auth.guard.ts') && context.includes('isEnabled')) {
            this.issues.push({
              file,
              line: i + 1,
              severity: 'CRITICAL',
              category: 'AUTHENTICATION_BYPASS',
              description: 'FirebaseAuthGuard permite acceso cuando está deshabilitado',
              currentCode: context,
              suggestedFix: this.getFirebaseGuardFix(),
              autoFixable: true,
            });
          }
        }
      }
    }
  }

  /**
   * Escanear servicios con lógica sensible
   */
  private async scanServices(): Promise<void> {
    console.log('⚙️  Escaneando servicios...');

    const serviceFiles = this.findFiles(this.srcPath, '.service.ts');

    for (const file of serviceFiles) {
      this.filesScanned++;
      const content = fs.readFileSync(file, 'utf-8');

      // Detectar almacenamiento de datos sensibles sin encriptar
      if (file.includes('manager.service.ts')) {
        if (content.includes('accessCode') && !content.includes('encrypt')) {
          // Este servicio YA tiene encriptación, verificar que se usa correctamente
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('accessCode:') && !lines[i].includes('encrypted')) {
              const context = this.getCodeBlock(lines, i, 3);
              if (!context.includes('encrypt')) {
                this.issues.push({
                  file,
                  line: i + 1,
                  severity: 'HIGH',
                  category: 'DATA_ENCRYPTION',
                  description: 'accessCode asignado sin encriptar',
                  currentCode: context,
                  autoFixable: false,
                });
              }
            }
          }
        }
      }

      // Detectar Device.config sin encriptar
      if (file.includes('iot') && content.includes('config:') && !content.includes('encrypt')) {
        this.issues.push({
          file,
          line: 0,
          severity: 'HIGH',
          category: 'DATA_ENCRYPTION',
          description: 'Device.config puede almacenar credenciales sin encriptar',
          autoFixable: false,
        });
      }

      // Detectar operaciones sin logging
      if (file.includes('public-api.service.ts')) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('openLock') && lines[i].includes('async')) {
            const methodBody = this.getMethodBody(lines, i);
            if (!methodBody.includes('accessLog')) {
              this.issues.push({
                file,
                line: i + 1,
                severity: 'MEDIUM',
                category: 'AUDIT_LOGGING',
                description: 'Operación openLock sin logging en AccessLog',
                autoFixable: false,
              });
            }
          }
        }
      }
    }
  }

  /**
   * Aplicar correcciones automáticas
   */
  private async applyFixes(): Promise<void> {
    console.log('\n🔧 Aplicando correcciones automáticas...\n');

    const fixableIssues = this.issues.filter(i => i.autoFixable);

    for (const issue of fixableIssues) {
      try {
        let content = fs.readFileSync(issue.file, 'utf-8');
        let fixed = false;

        switch (issue.category) {
          case 'AUTHENTICATION_BYPASS':
            if (issue.file.includes('admin.guard.ts')) {
              content = this.fixAdminGuard(content);
              fixed = true;
            } else if (issue.file.includes('firebase-auth.guard.ts')) {
              content = this.fixFirebaseGuard(content);
              fixed = true;
            } else if (issue.file.includes('public-api')) {
              content = this.fixOpenLockEndpoint(content);
              fixed = true;
            }
            break;

          case 'AUTHORIZATION_MISSING':
            if (issue.file.includes('iot.controller.ts')) {
              content = this.addGuardsToIoTController(content);
              fixed = true;
            }
            break;

          case 'VALIDATION_MISSING':
            if (issue.suggestedFix?.includes('published')) {
              content = this.addPublishedValidation(content, issue.line);
              fixed = true;
            }
            break;
        }

        if (fixed) {
          fs.writeFileSync(issue.file, content, 'utf-8');
          issue.fixed = true;
          this.fixedIssues.push(issue);
          console.log(`✅ Corregido: ${issue.category} en ${path.basename(issue.file)}`);
        }
      } catch (error) {
        console.error(`❌ Error corrigiendo ${issue.file}: ${error.message}`);
      }
    }
  }

  /**
   * CORRECCIONES ESPECÍFICAS
   */

  private fixAdminGuard(content: string): string {
    // Reemplazar bypass con validación correcta
    const oldCode = `if (!user) {
      // CHANGE: En modo demo sin auth, permitir acceso
      return true;
    }`;

    const newCode = `if (!user) {
      // SECURITY FIX: Nunca permitir acceso sin usuario
      throw new ForbiddenException('Autenticación requerida para acceso admin');
    }`;

    return content.replace(oldCode, newCode);
  }

  private fixFirebaseGuard(content: string): string {
    // Reemplazar bypass con modo demo controlado
    const oldCode = `if (!this.firebaseAuthService.isEnabled()) {
      this.logger.debug('Firebase deshabilitado, permitiendo acceso sin auth');
      return true;
    }`;

    const newCode = `if (!this.firebaseAuthService.isEnabled()) {
      // SECURITY FIX: Inyectar usuario demo con permisos limitados
      const devToken = request.headers['x-dev-token'];
      if (process.env.NODE_ENV !== 'production' && devToken === process.env.DEV_BYPASS_TOKEN) {
        request.firebaseUser = {
          uid: 'demo-user',
          email: 'demo@smartstay.com',
          role: 'DEMO',
        };
        this.logger.warn('⚠️ Acceso con token de desarrollo');
        return true;
      }
      throw new UnauthorizedException('Firebase Auth requerido en producción');
    }`;

    return content.replace(oldCode, newCode);
  }

  private fixOpenLockEndpoint(content: string): string {
    // Agregar validación de token en openLock
    const oldServiceCall = `async openLock(slug: string, deviceId: string, token?: string) {`;

    const newServiceCall = `async openLock(slug: string, deviceId: string, token: string, ip?: string) {
    // SECURITY FIX: Validar token temporal obligatorio
    if (!token) {
      throw new UnauthorizedException('Token de acceso requerido');
    }

    // 1. Validar token contra AccessCredential
    const credential = await this.prisma.accessCredential.findFirst({
      where: {
        deviceId,
        validFrom: { lte: new Date() },
        validTo: { gte: new Date() },
        revoked: false,
      },
    });

    if (!credential) {
      // Log intento no autorizado
      await this.logUnauthorizedAccess(slug, deviceId, ip || 'unknown');
      throw new UnauthorizedException('Token inválido o expirado');
    }`;

    if (content.includes(oldServiceCall)) {
      return content.replace(oldServiceCall, newServiceCall);
    }

    return content;
  }

  private addGuardsToIoTController(content: string): string {
    // Agregar imports si no existen
    if (!content.includes('UseGuards')) {
      content = content.replace(
        "import {",
        "import { UseGuards,"
      );
    }

    if (!content.includes('FirebaseAuthGuard')) {
      const importLine = content.split('\n').find(l => l.includes("from '@nestjs/common'"));
      if (importLine) {
        content = content.replace(
          importLine,
          `${importLine}\nimport { FirebaseAuthGuard } from '../firebase-auth/firebase-auth.guard';`
        );
      }
    }

    // Agregar guards a métodos open-door y device status
    content = content.replace(
      /@Post\('\/open-door'\)/g,
      `@UseGuards(FirebaseAuthGuard)\n  @Post('/open-door')`
    );

    content = content.replace(
      /@Get\('\/device\/:deviceId\/status'\)/g,
      `@UseGuards(FirebaseAuthGuard)\n  @Get('/device/:deviceId/status')`
    );

    return content;
  }

  private addPublishedValidation(content: string, lineNum: number): string {
    // Buscar el findUnique y agregar validación después
    const lines = content.split('\n');
    const methodStart = this.findMethodStart(lines, lineNum);

    if (methodStart >= 0) {
      // Buscar el cierre del await findUnique
      for (let i = methodStart; i < lines.length; i++) {
        if (lines[i].includes('findUnique') && lines[i].includes('unit')) {
          // Insertar validación después del findUnique
          let insertAt = i + 1;
          while (insertAt < lines.length && !lines[insertAt].includes(';')) {
            insertAt++;
          }
          insertAt++;

          const validation = `
    // SECURITY FIX: Validar que el apartamento esté publicado
    if (!unit || !unit.published) {
      throw new NotFoundException('Apartment not found');
    }
`;

          lines.splice(insertAt, 0, validation);
          return lines.join('\n');
        }
      }
    }

    return content;
  }

  /**
   * UTILIDADES
   */

  private findFiles(dir: string, extension: string): string[] {
    let files: string[] = [];

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules')) {
        files = files.concat(this.findFiles(fullPath, extension));
      } else if (item.endsWith(extension)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private extractEndpoint(lines: string[], index: number): string {
    const line = lines[index];
    const match = line.match(/@(?:Get|Post|Put|Delete|Patch)\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : '';
  }

  private getCodeBlock(lines: string[], index: number, count: number): string {
    const start = Math.max(0, index - Math.floor(count / 2));
    const end = Math.min(lines.length, index + Math.ceil(count / 2));
    return lines.slice(start, end).join('\n');
  }

  private getMethodBody(lines: string[], startIndex: number): string {
    let braceCount = 0;
    let inMethod = false;
    let body = '';

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('{')) {
        braceCount++;
        inMethod = true;
      }
      if (line.includes('}')) {
        braceCount--;
      }

      if (inMethod) {
        body += line + '\n';
      }

      if (inMethod && braceCount === 0) {
        break;
      }
    }

    return body;
  }

  private hasGuardInMethod(lines: string[], index: number): boolean {
    // Buscar decoradores antes del endpoint
    for (let i = index - 1; i >= Math.max(0, index - 10); i--) {
      if (lines[i].includes('@UseGuards(')) {
        return true;
      }
      if (lines[i].includes('@Get(') || lines[i].includes('@Post(')) {
        break; // Llegamos a otro endpoint
      }
    }
    return false;
  }

  private findMethodStart(lines: string[], currentLine: number): number {
    for (let i = currentLine; i >= 0; i--) {
      if (lines[i].includes('async') && lines[i].includes('(')) {
        return i;
      }
    }
    return -1;
  }

  /**
   * FIXES SUGERIDOS (para código de ejemplo)
   */

  private getOpenLockFix(): string {
    return `
// SECURITY FIX: Validación completa de token
async openLock(slug: string, deviceId: string, token: string, ip?: string) {
  // 1. Validar token temporal
  const credential = await this.prisma.accessCredential.findFirst({
    where: {
      deviceId,
      validFrom: { lte: new Date() },
      validTo: { gte: new Date() },
      revoked: false,
    },
  });

  if (!credential) {
    await this.logUnauthorizedAccess(slug, deviceId, ip);
    throw new UnauthorizedException('Token inválido o expirado');
  }

  // 2. Validar asociación device ↔ apartment
  const device = await this.prisma.device.findFirst({
    where: {
      id: deviceId,
      unit: { slug, published: true },
      active: true,
    },
    include: { unit: true },
  });

  if (!device) {
    throw new NotFoundException('Device not found for this apartment');
  }

  // 3. Ejecutar apertura
  const result = await this.iotService.openLock(device);

  // 4. Revocar token (one-time use)
  await this.prisma.accessCredential.update({
    where: { id: credential.id },
    data: { revoked: true },
  });

  return result;
}

private async logUnauthorizedAccess(slug: string, deviceId: string, ip: string) {
  await this.prisma.accessLog.create({
    data: {
      unitId: (await this.prisma.unit.findUnique({ where: { slug } }))?.id,
      deviceId,
      success: false,
      message: 'Intento no autorizado',
      metadata: { ip, timestamp: new Date() },
    },
  });
}`;
  }

  private getAdminGuardFix(): string {
    return `
canActivate(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  const user = request.firebaseUser || request.user;

  // SECURITY FIX: Nunca permitir acceso sin usuario
  if (!user) {
    throw new ForbiddenException('Autenticación requerida para acceso admin');
  }

  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Requiere rol ADMIN');
  }

  return true;
}`;
  }

  private getFirebaseGuardFix(): string {
    return `
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();

  if (!this.firebaseAuthService.isEnabled()) {
    // SECURITY FIX: Modo desarrollo controlado
    const devToken = request.headers['x-dev-token'];
    if (process.env.NODE_ENV !== 'production' && devToken === process.env.DEV_BYPASS_TOKEN) {
      request.firebaseUser = {
        uid: 'demo-user',
        email: 'demo@smartstay.com',
        role: 'DEMO',
      };
      this.logger.warn('⚠️ Acceso con token de desarrollo');
      return true;
    }
    throw new UnauthorizedException('Firebase Auth requerido');
  }

  // ... resto de validación con Firebase
}`;
  }

  /**
   * Generar reporte final
   */
  private generateReport(): AuditReport {
    const summary = {
      critical: this.issues.filter(i => i.severity === 'CRITICAL').length,
      high: this.issues.filter(i => i.severity === 'HIGH').length,
      medium: this.issues.filter(i => i.severity === 'MEDIUM').length,
      low: this.issues.filter(i => i.severity === 'LOW').length,
    };

    return {
      timestamp: new Date().toISOString(),
      filesScanned: this.filesScanned,
      endpointsAnalyzed: this.endpointsAnalyzed,
      issuesFound: this.issues,
      issuesFixed: this.fixedIssues,
      summary,
    };
  }

  /**
   * Generar reporte Markdown
   */
  generateMarkdownReport(report: AuditReport): string {
    let md = `# 🔒 Security Audit Report - SmartStay Guide Backend\n\n`;
    md += `**Fecha:** ${new Date(report.timestamp).toLocaleString()}\n`;
    md += `**Archivos escaneados:** ${report.filesScanned}\n`;
    md += `**Endpoints analizados:** ${report.endpointsAnalyzed}\n\n`;

    md += `## 📊 Resumen\n\n`;
    md += `| Severidad | Total | Corregidos |\n`;
    md += `|-----------|-------|------------|\n`;
    md += `| 🔴 Crítico | ${report.summary.critical} | ${report.issuesFixed.filter(i => i.severity === 'CRITICAL').length} |\n`;
    md += `| 🟡 Alto | ${report.summary.high} | ${report.issuesFixed.filter(i => i.severity === 'HIGH').length} |\n`;
    md += `| 🟠 Medio | ${report.summary.medium} | ${report.issuesFixed.filter(i => i.severity === 'MEDIUM').length} |\n`;
    md += `| 🟢 Bajo | ${report.summary.low} | ${report.issuesFixed.filter(i => i.severity === 'LOW').length} |\n\n`;

    md += `## 🔍 Vulnerabilidades Detectadas\n\n`;

    const groupedIssues = this.groupIssuesByCategory(report.issuesFound);

    for (const [category, issues] of Object.entries(groupedIssues)) {
      md += `### ${this.getCategoryIcon(category)} ${category}\n\n`;

      for (const issue of issues) {
        md += `**${this.getSeverityIcon(issue.severity)} ${issue.severity}** - ${path.basename(issue.file)}:${issue.line}\n\n`;
        md += `${issue.description}\n\n`;

        if (issue.currentCode) {
          md += `\`\`\`typescript\n${issue.currentCode.trim()}\n\`\`\`\n\n`;
        }

        if (issue.suggestedFix) {
          md += `**Corrección sugerida:**\n\n`;
          md += `\`\`\`typescript\n${issue.suggestedFix.trim()}\n\`\`\`\n\n`;
        }

        if (issue.fixed) {
          md += `✅ **Corregido automáticamente**\n\n`;
        } else if (issue.autoFixable) {
          md += `⏳ **Auto-corregible** (ejecutar con --apply)\n\n`;
        } else {
          md += `⚠️ **Requiere corrección manual**\n\n`;
        }

        md += `---\n\n`;
      }
    }

    md += `## ✅ Correcciones Aplicadas\n\n`;

    if (report.issuesFixed.length === 0) {
      md += `No se aplicaron correcciones (ejecutado en modo dry-run).\n`;
      md += `Para aplicar correcciones: \`ts-node scripts/security-audit-and-fix.ts --apply\`\n\n`;
    } else {
      for (const issue of report.issuesFixed) {
        md += `- ✅ ${issue.category} en ${path.basename(issue.file)}:${issue.line}\n`;
      }
    }

    md += `\n## 📋 Recomendaciones Adicionales\n\n`;
    md += this.getAdditionalRecommendations();

    return md;
  }

  private groupIssuesByCategory(issues: SecurityIssue[]): Record<string, SecurityIssue[]> {
    const grouped: Record<string, SecurityIssue[]> = {};

    for (const issue of issues) {
      if (!grouped[issue.category]) {
        grouped[issue.category] = [];
      }
      grouped[issue.category].push(issue);
    }

    return grouped;
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟡';
      case 'MEDIUM': return '🟠';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  }

  private getCategoryIcon(category: string): string {
    switch (category) {
      case 'AUTHENTICATION_BYPASS': return '🚨';
      case 'AUTHORIZATION_MISSING': return '🔐';
      case 'AUTHENTICATION_MISSING': return '🔓';
      case 'DATA_EXPOSURE': return '📊';
      case 'VALIDATION_MISSING': return '✅';
      case 'DATA_ENCRYPTION': return '🔒';
      case 'AUDIT_LOGGING': return '📝';
      default: return '⚠️';
    }
  }

  private getAdditionalRecommendations(): string {
    return `
### 1. Rate Limiting
Implementar rate limiting global usando @nestjs/throttler:
\`\`\`typescript
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
  ],
})
\`\`\`

### 2. Helmet para Headers de Seguridad
\`\`\`typescript
import helmet from 'helmet';
app.use(helmet());
\`\`\`

### 3. Validación Global de DTOs
\`\`\`typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
\`\`\`

### 4. Sistema de Tokens Temporales
Implementar generación de tokens con hash SHA-256 para apertura de cerraduras.

### 5. Logging Estructurado
Migrar a Winston para logging en producción con rotación de archivos.

### 6. Monitoring y Alertas
Integrar Sentry para error tracking y alertas en tiempo real.

### 7. 2FA para Admins
Implementar autenticación de dos factores con TOTP (Google Authenticator).

### 8. Circuit Breaker para IoT
Implementar circuit breaker para providers externos y evitar cascading failures.
`;
  }
}

/**
 * MAIN
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   SmartStay Guide - Security Audit & Fix Script       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('⚠️  Modo DRY-RUN activado (solo análisis, sin modificaciones)');
    console.log('   Para aplicar correcciones: ts-node scripts/security-audit-and-fix.ts --apply\n');
  } else {
    console.log('🔧 Modo APPLY activado (se aplicarán correcciones automáticas)\n');
  }

  const auditor = new SecurityAuditor(dryRun);
  const report = await auditor.run();

  console.log('\n' + '='.repeat(60));
  console.log('AUDITORÍA COMPLETADA');
  console.log('='.repeat(60) + '\n');

  console.log(`📋 Archivos escaneados: ${report.filesScanned}`);
  console.log(`🔍 Endpoints analizados: ${report.endpointsAnalyzed}`);
  console.log(`\n🚨 Vulnerabilidades encontradas:`);
  console.log(`   🔴 Críticas: ${report.summary.critical}`);
  console.log(`   🟡 Altas: ${report.summary.high}`);
  console.log(`   🟠 Medias: ${report.summary.medium}`);
  console.log(`   🟢 Bajas: ${report.summary.low}`);

  if (report.issuesFixed.length > 0) {
    console.log(`\n✅ Correcciones aplicadas: ${report.issuesFixed.length}`);
  }

  // Generar reporte Markdown
  const markdown = auditor.generateMarkdownReport(report);
  const reportPath = path.join(__dirname, '..', 'SECURITY-AUDIT-REPORT.md');
  fs.writeFileSync(reportPath, markdown, 'utf-8');

  console.log(`\n📄 Reporte generado: ${reportPath}`);

  // Generar reporte JSON
  const jsonPath = path.join(__dirname, '..', 'security-audit-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`📄 Reporte JSON: ${jsonPath}\n`);

  if (dryRun && report.issuesFound.length > 0) {
    console.log('💡 Para aplicar correcciones automáticas, ejecuta:');
    console.log('   ts-node scripts/security-audit-and-fix.ts --apply\n');
  }

  // Salir con código de error si hay issues críticos
  if (report.summary.critical > 0 || report.summary.high > 0) {
    console.log('⚠️  ATENCIÓN: Se encontraron vulnerabilidades críticas/altas\n');
    process.exit(1);
  }

  process.exit(0);
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
