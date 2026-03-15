import type { AppConfig } from './config/AppConfig';
import { PostgresDatabase } from './db/PostgresDatabase';
import { SchemaManager } from './db/SchemaManager';
import { AuditLogRepository } from './repositories/AuditLogRepository';
import { AdminRepository } from './repositories/AdminRepository';
import { BindingRepository } from './repositories/BindingRepository';
import { TagRepository } from './repositories/TagRepository';
import { UserRepository } from './repositories/UserRepository';
import { WebIdRepository } from './repositories/WebIdRepository';
import { AdminService } from './services/AdminService';
import { AuditLogService } from './services/AuditLogService';
import { AuthService } from './services/AuthService';
import { BindingService } from './services/BindingService';
import { HistoryService } from './services/HistoryService';
import { TagService } from './services/TagService';
import { WebIdService } from './services/WebIdService';

export class AppContainer {
  public readonly database: PostgresDatabase;
  public readonly schemaManager: SchemaManager;
  public readonly authService: AuthService;
  public readonly tagService: TagService;
  public readonly webIdService: WebIdService;
  public readonly bindingService: BindingService;
  public readonly historyService: HistoryService;
  public readonly auditLogService: AuditLogService;
  public readonly adminService: AdminService;

  public constructor(config: AppConfig) {
    this.database = new PostgresDatabase(config);
    this.schemaManager = new SchemaManager(this.database, config);

    const userRepository = new UserRepository(this.database);
    const tagRepository = new TagRepository(this.database);
    const webIdRepository = new WebIdRepository(this.database);
    const bindingRepository = new BindingRepository(this.database);
    const auditLogRepository = new AuditLogRepository(this.database);
    const adminRepository = new AdminRepository(this.database);

    this.authService = new AuthService(config, userRepository);
    this.auditLogService = new AuditLogService(auditLogRepository);
    this.tagService = new TagService(config, tagRepository);
    this.webIdService = new WebIdService(webIdRepository, tagRepository);
    this.bindingService = new BindingService(bindingRepository, this.webIdService, this.auditLogService);
    this.historyService = new HistoryService(tagRepository, this.webIdService);
    this.adminService = new AdminService(userRepository, adminRepository, this.auditLogService);
  }
}
