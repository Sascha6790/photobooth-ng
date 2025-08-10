import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitialSchema1735000000000 implements MigrationInterface {
  name = 'InitialSchema1735000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sessions table
    await queryRunner.createTable(
      new Table({
        name: 'sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'deviceType',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'imageCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'printCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'duration',
            type: 'int',
            default: 0,
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'statistics',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'qrCodeToken',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'isRemoteControlled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'remoteControlToken',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create images table
    await queryRunner.createTable(
      new Table({
        name: 'images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'filename',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'filepath',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'thumbnailPath',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            default: "'single'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'processing'",
          },
          {
            name: 'fileSize',
            type: 'int',
            default: 0,
          },
          {
            name: 'width',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'height',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'viewCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'printCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'downloadCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'isFavorite',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'exifData',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'qrCodeUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'sessionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['sessionId'],
            referencedTableName: 'sessions',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    // Create print_jobs table
    await queryRunner.createTable(
      new Table({
        name: 'print_jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'imageFilePath',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'imageId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'priority',
            type: 'varchar',
            length: '20',
            default: "'normal'",
          },
          {
            name: 'copies',
            type: 'int',
            default: 1,
          },
          {
            name: 'printerName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'printerSettings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'attemptCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'maxAttempts',
            type: 'int',
            default: 3,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'errorDetails',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'sessionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'queuePosition',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'estimatedPrintTime',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'actualPrintTime',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['sessionId'],
            referencedTableName: 'sessions',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    // Create settings table
    await queryRunner.createTable(
      new Table({
        name: 'settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'value',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            default: "'string'",
          },
          {
            name: 'category',
            type: 'varchar',
            length: '20',
            default: "'general'",
          },
          {
            name: 'label',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'defaultValue',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'validation',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isSystem',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isEncrypted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'lastModifiedBy',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'lastModifiedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
          {
            name: 'changeHistory',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'sessions',
      new TableIndex({
        name: 'IDX_SESSION_STATUS_CREATED',
        columnNames: ['status', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'images',
      new TableIndex({
        name: 'IDX_IMAGE_SESSION_CREATED',
        columnNames: ['sessionId', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'images',
      new TableIndex({
        name: 'IDX_IMAGE_STATUS_CREATED',
        columnNames: ['status', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'images',
      new TableIndex({
        name: 'IDX_IMAGE_FILEPATH',
        columnNames: ['filepath'],
      })
    );

    await queryRunner.createIndex(
      'images',
      new TableIndex({
        name: 'IDX_IMAGE_STATUS',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'print_jobs',
      new TableIndex({
        name: 'IDX_PRINTJOB_STATUS_PRIORITY_CREATED',
        columnNames: ['status', 'priority', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'print_jobs',
      new TableIndex({
        name: 'IDX_PRINTJOB_SESSION_CREATED',
        columnNames: ['sessionId', 'createdAt'],
      })
    );

    await queryRunner.createIndex(
      'print_jobs',
      new TableIndex({
        name: 'IDX_PRINTJOB_STATUS',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'settings',
      new TableIndex({
        name: 'IDX_SETTINGS_CATEGORY_KEY',
        columnNames: ['category', 'key'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'settings',
      new TableIndex({
        name: 'IDX_SETTINGS_CATEGORY',
        columnNames: ['category'],
      })
    );

    await queryRunner.createIndex(
      'settings',
      new TableIndex({
        name: 'IDX_SETTINGS_KEY',
        columnNames: ['key'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('settings', 'IDX_SETTINGS_KEY');
    await queryRunner.dropIndex('settings', 'IDX_SETTINGS_CATEGORY');
    await queryRunner.dropIndex('settings', 'IDX_SETTINGS_CATEGORY_KEY');
    await queryRunner.dropIndex('print_jobs', 'IDX_PRINTJOB_STATUS');
    await queryRunner.dropIndex('print_jobs', 'IDX_PRINTJOB_SESSION_CREATED');
    await queryRunner.dropIndex('print_jobs', 'IDX_PRINTJOB_STATUS_PRIORITY_CREATED');
    await queryRunner.dropIndex('images', 'IDX_IMAGE_STATUS');
    await queryRunner.dropIndex('images', 'IDX_IMAGE_FILEPATH');
    await queryRunner.dropIndex('images', 'IDX_IMAGE_STATUS_CREATED');
    await queryRunner.dropIndex('images', 'IDX_IMAGE_SESSION_CREATED');
    await queryRunner.dropIndex('sessions', 'IDX_SESSION_STATUS_CREATED');

    // Drop tables
    await queryRunner.dropTable('settings', true);
    await queryRunner.dropTable('print_jobs', true);
    await queryRunner.dropTable('images', true);
    await queryRunner.dropTable('sessions', true);
  }
}