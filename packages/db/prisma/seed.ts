/**
 * GRID-X seed data.
 *
 * Creates the permission catalogue, roles, OSWAR companies, internal users, a small partner
 * network and one complete job flow so every screen has meaningful data on first run.
 */
import { PrismaClient, Prisma, JobStatus, ProcessType, RoleCode } from '@prisma/client';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@gridx/shared';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'GridX@2025!';

const PARTNER_ROLE_CODES: RoleCode[] = ['PARTNER_OWNER', 'PARTNER_SUPERVISOR', 'PARTNER_WORKER'];

const PROCESS_SEED: { code: ProcessType; name: string; ratePerHour: number }[] = [
  { code: 'CUTTING', name: 'Cutting', ratePerHour: 320 },
  { code: 'BENDING', name: 'Bending', ratePerHour: 380 },
  { code: 'WELDING', name: 'Welding', ratePerHour: 420 },
  { code: 'FABRICATION', name: 'Fabrication', ratePerHour: 450 },
  { code: 'MACHINING', name: 'Machining', ratePerHour: 650 },
  { code: 'DRILLING', name: 'Drilling', ratePerHour: 300 },
  { code: 'GRINDING', name: 'Grinding', ratePerHour: 280 },
  { code: 'PAINTING', name: 'Painting', ratePerHour: 260 },
  { code: 'ASSEMBLY', name: 'Assembly', ratePerHour: 340 },
  { code: 'PACKING', name: 'Packing', ratePerHour: 180 },
  { code: 'ELECTRICAL_WIRING', name: 'Electrical wiring', ratePerHour: 400 },
  { code: 'TRANSPORT', name: 'Transport', ratePerHour: 150 },
];

const INTERNAL_USERS: {
  name: string;
  email: string;
  phone: string;
  roleCode: RoleCode;
  designation: string;
}[] = [
  {
    name: 'Aarti Oswal',
    email: 'admin@oswar.example',
    phone: '9800000001',
    roleCode: 'GROUP_ADMIN',
    designation: 'Group Director',
  },
  {
    name: 'Rohit Kulkarni',
    email: 'gridx.head@oswar.example',
    phone: '9800000002',
    roleCode: 'GRIDX_HEAD',
    designation: 'GRID-X Head',
  },
  {
    name: 'Sneha Patil',
    email: 'operations@oswar.example',
    phone: '9800000003',
    roleCode: 'OPERATIONS_HEAD',
    designation: 'Operations Head',
  },
  {
    name: 'Vikram Rao',
    email: 'engineering@oswar.example',
    phone: '9800000004',
    roleCode: 'ENGINEERING_USER',
    designation: 'Design Engineer',
  },
  {
    name: 'Prakash Jain',
    email: 'procurement@oswar.example',
    phone: '9800000005',
    roleCode: 'PROCUREMENT_USER',
    designation: 'Procurement Lead',
  },
  {
    name: 'Meera Shah',
    email: 'quality@oswar.example',
    phone: '9800000006',
    roleCode: 'QUALITY_INSPECTOR',
    designation: 'Quality Inspector',
  },
  {
    name: 'Sunil Gaikwad',
    email: 'stores@oswar.example',
    phone: '9800000007',
    roleCode: 'STORES_USER',
    designation: 'Stores In-charge',
  },
  {
    name: 'Neha Agarwal',
    email: 'finance@oswar.example',
    phone: '9800000008',
    roleCode: 'FINANCE_USER',
    designation: 'Finance Manager',
  },
  {
    name: 'Imran Shaikh',
    email: 'logistics@oswar.example',
    phone: '9800000009',
    roleCode: 'LOGISTICS_COORDINATOR',
    designation: 'Logistics Coordinator',
  },
  {
    name: 'Anil Oswal',
    email: 'management@oswar.example',
    phone: '9800000010',
    roleCode: 'MANAGEMENT_VIEWER',
    designation: 'Managing Director',
  },
];

function days(offset: number): Date {
  return new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
}

async function seedPermissionsAndRoles(): Promise<Map<RoleCode, string>> {
  for (const code of Object.values(PERMISSIONS)) {
    const [resource, action] = code.split(':');
    await prisma.permission.upsert({
      where: { code },
      create: { code, resource, action },
      update: { resource, action },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionIds = new Map(permissions.map((permission) => [permission.code, permission.id]));
  const roleIds = new Map<RoleCode, string>();

  for (const [code, grants] of Object.entries(ROLE_PERMISSIONS) as [RoleCode, string[]][]) {
    const role = await prisma.role.upsert({
      where: { code },
      create: {
        code,
        name: ROLE_LABELS[code],
        description: ROLE_DESCRIPTIONS[code],
        isPartnerRole: PARTNER_ROLE_CODES.includes(code),
      },
      update: {
        name: ROLE_LABELS[code],
        description: ROLE_DESCRIPTIONS[code],
        isPartnerRole: PARTNER_ROLE_CODES.includes(code),
      },
    });
    roleIds.set(code, role.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: grants
        .map((permissionCode) => permissionIds.get(permissionCode))
        .filter((permissionId): permissionId is string => Boolean(permissionId))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
    });
  }

  return roleIds;
}

async function main(): Promise<void> {
  const roleIds = await seedPermissionsAndRoles();
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const company = await prisma.company.upsert({
    where: { code: 'OSWAR' },
    create: {
      code: 'OSWAR',
      name: 'OSWAR Rotocorp',
      legalName: 'OSWAR Rotocorp Private Limited',
      gstNumber: '27AABCO1234A1Z5',
      addressLine1: 'Plot E-14, MIDC Industrial Area',
      city: 'Nagpur',
      state: 'Maharashtra',
      pincode: '440016',
    },
    update: {},
  });

  const sisterCompany = await prisma.company.upsert({
    where: { code: 'OSWAL' },
    create: {
      code: 'OSWAL',
      name: 'Oswal Engineers',
      legalName: 'Oswal Engineers Private Limited',
      addressLine1: 'Plot 22, Hingna Industrial Estate',
      city: 'Nagpur',
      state: 'Maharashtra',
      pincode: '440028',
    },
    update: {},
  });

  const internalUsers = new Map<RoleCode, string>();
  for (const definition of INTERNAL_USERS) {
    const roleId = roleIds.get(definition.roleCode);
    if (!roleId) continue;
    const user = await prisma.user.upsert({
      where: { email: definition.email },
      create: {
        name: definition.name,
        email: definition.email,
        phone: definition.phone,
        roleId,
        userType: 'INTERNAL',
        status: 'ACTIVE',
        designation: definition.designation,
        passwordHash,
        passwordUpdatedAt: new Date(),
        twoFactorEnabled: false,
        companies: {
          create: [
            { companyId: company.id, isDefault: true },
            ...(definition.roleCode === 'GROUP_ADMIN'
              ? [{ companyId: sisterCompany.id, isDefault: false }]
              : []),
          ],
        },
      },
      update: { passwordHash, status: 'ACTIVE', roleId },
    });
    internalUsers.set(definition.roleCode, user.id);
  }

  const engineerId = internalUsers.get('ENGINEERING_USER');
  const gridxHeadId = internalUsers.get('GRIDX_HEAD');
  const qualityId = internalUsers.get('QUALITY_INSPECTOR');
  const storesId = internalUsers.get('STORES_USER');

  const processes = new Map<ProcessType, string>();
  for (const definition of PROCESS_SEED) {
    const process = await prisma.process.upsert({
      where: { code: definition.code },
      create: {
        code: definition.code,
        name: definition.name,
        standardRatePerHour: definition.ratePerHour,
      },
      update: { name: definition.name, standardRatePerHour: definition.ratePerHour },
    });
    processes.set(definition.code, process.id);
  }

  const items = await Promise.all(
    [
      {
        code: 'RM-MS-PLT-8',
        name: 'MS Plate 8 mm IS 2062 E250',
        uom: 'KG',
        materialGrade: 'IS2062 E250BR',
        standardRate: 62,
      },
      {
        code: 'RM-MS-PIPE-50',
        name: 'MS Pipe 50 NB Sch 40',
        uom: 'KG',
        materialGrade: 'IS1239',
        standardRate: 71,
      },
      {
        code: 'CN-WELD-ER70S',
        name: 'Welding wire ER70S-6 1.2 mm',
        uom: 'KG',
        materialGrade: 'ER70S-6',
        standardRate: 118,
      },
      {
        code: 'CN-PAINT-EPOXY',
        name: 'Epoxy primer grey',
        uom: 'LTR',
        materialGrade: 'EP-2K',
        standardRate: 340,
      },
    ].map((item) =>
      prisma.item.upsert({ where: { code: item.code }, create: item, update: item }),
    ),
  );

  const product = await prisma.product.upsert({
    where: { companyId_code: { companyId: company.id, code: 'RM-1200' } },
    create: {
      companyId: company.id,
      code: 'RM-1200',
      name: 'Rotomoulding machine 1200 series',
      description: 'Bi-axial rotomoulding machine platform.',
    },
    update: {},
  });

  const componentSeed = [
    {
      componentCode: 'CMP-ARM-001',
      name: 'Oven arm weldment',
      primaryProcess: 'WELDING' as ProcessType,
      criticality: 'CLASS_A' as const,
      inspectionLevel: 'LEVEL_4_CRITICAL_100_PERCENT' as const,
      theoreticalWeightKg: 82.5,
      standardCycleTimeMinutes: 210,
      standardConversionRate: 2450,
      materialGrade: 'IS2062 E250BR',
      itemQuantity: 86,
    },
    {
      componentCode: 'CMP-FRM-014',
      name: 'Machine base frame',
      primaryProcess: 'FABRICATION' as ProcessType,
      criticality: 'CLASS_B' as const,
      inspectionLevel: 'LEVEL_2_SAMPLING' as const,
      theoreticalWeightKg: 164,
      standardCycleTimeMinutes: 320,
      standardConversionRate: 3900,
      materialGrade: 'IS2062 E250BR',
      itemQuantity: 172,
    },
    {
      componentCode: 'CMP-BRK-207',
      name: 'Support bracket set',
      primaryProcess: 'CUTTING' as ProcessType,
      criticality: 'CLASS_C' as const,
      inspectionLevel: 'LEVEL_1_VISUAL' as const,
      theoreticalWeightKg: 6.4,
      standardCycleTimeMinutes: 24,
      standardConversionRate: 210,
      materialGrade: 'IS2062 E250BR',
      itemQuantity: 6.8,
    },
    // Phase 3 asks for 15–25 pilot components across the process mix, so the allocation engine,
    // the capacity board and the concentration report all have something real to chew on.
    {
      componentCode: 'CMP-SHF-032',
      name: 'Main drive shaft',
      primaryProcess: 'MACHINING' as ProcessType,
      criticality: 'CLASS_A' as const,
      inspectionLevel: 'LEVEL_3_FULL_DIMENSIONAL' as const,
      theoreticalWeightKg: 44.2,
      standardCycleTimeMinutes: 165,
      standardConversionRate: 3150,
      materialGrade: 'EN8D',
      itemQuantity: 48,
    },
    {
      componentCode: 'CMP-GRD-118',
      name: 'Safety guard panel',
      primaryProcess: 'BENDING' as ProcessType,
      criticality: 'CLASS_C' as const,
      inspectionLevel: 'LEVEL_2_SAMPLING' as const,
      theoreticalWeightKg: 11.8,
      standardCycleTimeMinutes: 38,
      standardConversionRate: 420,
      materialGrade: 'IS513 CR4',
      itemQuantity: 12.6,
    },
    {
      componentCode: 'CMP-HUB-044',
      name: 'Rotor hub machined',
      primaryProcess: 'MACHINING' as ProcessType,
      criticality: 'CLASS_B' as const,
      inspectionLevel: 'LEVEL_3_FULL_DIMENSIONAL' as const,
      theoreticalWeightKg: 28.6,
      standardCycleTimeMinutes: 128,
      standardConversionRate: 2240,
      materialGrade: 'EN19',
      itemQuantity: 31,
    },
    {
      componentCode: 'CMP-DUC-076',
      name: 'Hot air duct assembly',
      primaryProcess: 'FABRICATION' as ProcessType,
      criticality: 'CLASS_B' as const,
      inspectionLevel: 'LEVEL_2_SAMPLING' as const,
      theoreticalWeightKg: 37.4,
      standardCycleTimeMinutes: 146,
      standardConversionRate: 1780,
      materialGrade: 'SS304',
      itemQuantity: 40,
    },
    {
      componentCode: 'CMP-PLT-201',
      name: 'Mounting plate laser cut',
      primaryProcess: 'CUTTING' as ProcessType,
      criticality: 'CLASS_D' as const,
      inspectionLevel: 'LEVEL_1_VISUAL' as const,
      theoreticalWeightKg: 3.9,
      standardCycleTimeMinutes: 12,
      standardConversionRate: 96,
      materialGrade: 'IS2062 E250BR',
      itemQuantity: 4.2,
    },
    {
      componentCode: 'CMP-FRM-021',
      name: 'Control panel enclosure',
      primaryProcess: 'FABRICATION' as ProcessType,
      criticality: 'CLASS_C' as const,
      inspectionLevel: 'LEVEL_2_SAMPLING' as const,
      theoreticalWeightKg: 22.1,
      standardCycleTimeMinutes: 94,
      standardConversionRate: 1180,
      materialGrade: 'IS513 CR4',
      itemQuantity: 24,
    },
    {
      componentCode: 'CMP-ARM-009',
      name: 'Secondary oven arm',
      primaryProcess: 'WELDING' as ProcessType,
      criticality: 'CLASS_B' as const,
      inspectionLevel: 'LEVEL_3_FULL_DIMENSIONAL' as const,
      theoreticalWeightKg: 61.3,
      standardCycleTimeMinutes: 178,
      standardConversionRate: 2050,
      materialGrade: 'IS2062 E250BR',
      itemQuantity: 65,
    },
    {
      componentCode: 'CMP-PIN-155',
      name: 'Locking pin set',
      primaryProcess: 'MACHINING' as ProcessType,
      criticality: 'CLASS_D' as const,
      inspectionLevel: 'LEVEL_2_SAMPLING' as const,
      theoreticalWeightKg: 1.4,
      standardCycleTimeMinutes: 9,
      standardConversionRate: 74,
      materialGrade: 'EN8D',
      itemQuantity: 1.6,
    },
    {
      componentCode: 'CMP-TNK-088',
      name: 'Coolant tank welded',
      primaryProcess: 'WELDING' as ProcessType,
      criticality: 'CLASS_C' as const,
      inspectionLevel: 'LEVEL_2_SAMPLING' as const,
      theoreticalWeightKg: 26.7,
      standardCycleTimeMinutes: 102,
      standardConversionRate: 1320,
      materialGrade: 'SS304',
      itemQuantity: 29,
    },
    {
      componentCode: 'CMP-CVR-133',
      name: 'Inspection cover',
      primaryProcess: 'BENDING' as ProcessType,
      criticality: 'CLASS_D' as const,
      inspectionLevel: 'LEVEL_1_VISUAL' as const,
      theoreticalWeightKg: 5.2,
      standardCycleTimeMinutes: 16,
      standardConversionRate: 148,
      materialGrade: 'IS513 CR4',
      itemQuantity: 5.6,
    },
    {
      componentCode: 'CMP-BSE-052',
      name: 'Gearbox mounting base',
      primaryProcess: 'MACHINING' as ProcessType,
      criticality: 'CLASS_B' as const,
      inspectionLevel: 'LEVEL_3_FULL_DIMENSIONAL' as const,
      theoreticalWeightKg: 54.8,
      standardCycleTimeMinutes: 196,
      standardConversionRate: 3480,
      materialGrade: 'IS2062 E250BR',
      itemQuantity: 58,
    },
    {
      componentCode: 'CMP-RLR-097',
      name: 'Idler roller assembly',
      primaryProcess: 'ASSEMBLY' as ProcessType,
      criticality: 'CLASS_C' as const,
      inspectionLevel: 'LEVEL_2_SAMPLING' as const,
      theoreticalWeightKg: 14.6,
      standardCycleTimeMinutes: 52,
      standardConversionRate: 680,
      materialGrade: 'EN8D',
      itemQuantity: 15.8,
    },
    {
      componentCode: 'CMP-STD-176',
      name: 'Floor stand fabricated',
      primaryProcess: 'FABRICATION' as ProcessType,
      criticality: 'CLASS_D' as const,
      inspectionLevel: 'LEVEL_1_VISUAL' as const,
      theoreticalWeightKg: 19.3,
      standardCycleTimeMinutes: 64,
      standardConversionRate: 540,
      materialGrade: 'IS1239',
      itemQuantity: 21,
    },
    {
      componentCode: 'CMP-CHT-064',
      name: 'Discharge chute',
      primaryProcess: 'FABRICATION' as ProcessType,
      criticality: 'CLASS_C' as const,
      inspectionLevel: 'LEVEL_2_SAMPLING' as const,
      theoreticalWeightKg: 31.5,
      standardCycleTimeMinutes: 118,
      standardConversionRate: 1460,
      materialGrade: 'SS304',
      itemQuantity: 34,
    },
    {
      componentCode: 'CMP-CLP-188',
      name: 'Pipe clamp set',
      primaryProcess: 'CUTTING' as ProcessType,
      criticality: 'CLASS_D' as const,
      inspectionLevel: 'LEVEL_1_VISUAL' as const,
      theoreticalWeightKg: 2.1,
      standardCycleTimeMinutes: 7,
      standardConversionRate: 62,
      materialGrade: 'IS2062 E250BR',
      itemQuantity: 2.3,
    },
    {
      componentCode: 'CMP-FLG-119',
      name: 'Blower flange machined',
      primaryProcess: 'MACHINING' as ProcessType,
      criticality: 'CLASS_C' as const,
      inspectionLevel: 'LEVEL_3_FULL_DIMENSIONAL' as const,
      theoreticalWeightKg: 9.7,
      standardCycleTimeMinutes: 41,
      standardConversionRate: 720,
      materialGrade: 'EN19',
      itemQuantity: 10.4,
    },
    {
      componentCode: 'CMP-LDR-142',
      name: 'Access ladder welded',
      primaryProcess: 'WELDING' as ProcessType,
      criticality: 'CLASS_D' as const,
      inspectionLevel: 'LEVEL_1_VISUAL' as const,
      theoreticalWeightKg: 16.8,
      standardCycleTimeMinutes: 58,
      standardConversionRate: 480,
      materialGrade: 'IS1239',
      itemQuantity: 18.2,
    },
  ];

  const components = [];
  for (const definition of componentSeed) {
    const component = await prisma.component.upsert({
      where: {
        companyId_componentCode: { companyId: company.id, componentCode: definition.componentCode },
      },
      create: {
        companyId: company.id,
        productId: product.id,
        componentCode: definition.componentCode,
        name: definition.name,
        drawingNumber: `DRG-${definition.componentCode}`,
        materialGrade: definition.materialGrade,
        theoreticalWeightKg: definition.theoreticalWeightKg,
        primaryProcess: definition.primaryProcess,
        inspectionLevel: definition.inspectionLevel,
        criticality: definition.criticality,
        standardCycleTimeMinutes: definition.standardCycleTimeMinutes,
        standardConversionRate: definition.standardConversionRate,
        packagingRequirement: 'Wooden pallet, edge protection, rust preventive coating.',
        outsourcingEligibilityScore: definition.criticality === 'CLASS_A' ? 55 : 85,
      },
      update: {},
    });
    components.push(component);

    const processId = processes.get(definition.primaryProcess);
    if (processId) {
      await prisma.componentProcess.upsert({
        where: {
          componentId_processId_sequence: {
            componentId: component.id,
            processId,
            sequence: 1,
          },
        },
        create: {
          componentId: component.id,
          processId,
          sequence: 1,
          cycleTimeMinutes: definition.standardCycleTimeMinutes,
        },
        update: {},
      });
    }

    await prisma.componentItem.upsert({
      where: { componentId_itemId: { componentId: component.id, itemId: items[0].id } },
      create: {
        componentId: component.id,
        itemId: items[0].id,
        quantityPerUnit: definition.itemQuantity,
        uom: 'KG',
      },
      update: {},
    });
  }

  const partnerSeed = [
    {
      partnerCode: 'PTR-00001',
      businessName: 'Shree Fabrication Works',
      ownerName: 'Ramesh Deshmukh',
      phone: '9811100001',
      email: 'owner@shreefab.example',
      city: 'Nagpur',
      distanceKm: 14,
      category: 'A' as const,
      level: 'L3_MEDIUM' as const,
      approvalStatus: 'CERTIFIED' as const,
      auditStatus: 'PASSED' as const,
      maxCapacityHours: 1600,
      capabilities: ['WELDING', 'FABRICATION', 'CUTTING'] as ProcessType[],
    },
    {
      partnerCode: 'PTR-00002',
      businessName: 'Vidarbha Precision Works',
      ownerName: 'Sanjay Thakre',
      phone: '9811100002',
      email: 'owner@vidarbhaprecision.example',
      city: 'Butibori',
      distanceKm: 32,
      category: 'B' as const,
      level: 'L2_SMALL' as const,
      approvalStatus: 'APPROVED' as const,
      auditStatus: 'PASSED' as const,
      maxCapacityHours: 900,
      capabilities: ['MACHINING', 'DRILLING', 'GRINDING'] as ProcessType[],
    },
    {
      partnerCode: 'PTR-00003',
      businessName: 'Ganesh Engineering Unit',
      ownerName: 'Pramod Wankhede',
      phone: '9811100003',
      email: 'owner@ganeshengg.example',
      city: 'Hingna',
      distanceKm: 21,
      category: 'C' as const,
      level: 'L1_MICRO' as const,
      approvalStatus: 'TRIAL_APPROVED' as const,
      auditStatus: 'PASSED' as const,
      maxCapacityHours: 420,
      capabilities: ['CUTTING', 'PAINTING', 'PACKING'] as ProcessType[],
    },
    // Phase 3 runs the pilot with five partners. Four and five deliberately widen the spread:
    // one strategic partner with the heavy machining the network otherwise lacks, and one micro
    // unit still in capability audit, so the approval workflow and the allocation guards both
    // have something to refuse.
    {
      partnerCode: 'PTR-00004',
      businessName: 'Kalmeshwar Heavy Fabricators',
      ownerName: 'Anil Rathod',
      phone: '9811100004',
      email: 'owner@kalmeshwarheavy.example',
      city: 'Kalmeshwar',
      distanceKm: 27,
      category: 'A' as const,
      level: 'L4_STRATEGIC' as const,
      approvalStatus: 'STRATEGIC' as const,
      auditStatus: 'PASSED' as const,
      maxCapacityHours: 2400,
      capabilities: ['MACHINING', 'FABRICATION', 'WELDING', 'ASSEMBLY'] as ProcessType[],
    },
    {
      partnerCode: 'PTR-00005',
      businessName: 'Umred Sheet Metal Works',
      ownerName: 'Nitin Kale',
      phone: '9811100005',
      email: 'owner@umredsheetmetal.example',
      city: 'Umred',
      distanceKm: 48,
      category: 'C' as const,
      level: 'L1_MICRO' as const,
      approvalStatus: 'CAPABILITY_AUDIT' as const,
      auditStatus: 'SCHEDULED' as const,
      maxCapacityHours: 320,
      capabilities: ['BENDING', 'CUTTING', 'PAINTING'] as ProcessType[],
    },
  ];

  const partners = [];
  for (const definition of partnerSeed) {
    const partner = await prisma.partner.upsert({
      where: { partnerCode: definition.partnerCode },
      create: {
        partnerCode: definition.partnerCode,
        companyId: company.id,
        businessName: definition.businessName,
        ownerName: definition.ownerName,
        phone: definition.phone,
        email: definition.email,
        addressLine1: 'MIDC Industrial Area',
        city: definition.city,
        state: 'Maharashtra',
        pincode: '440016',
        distanceKm: definition.distanceKm,
        gstNumber: `27AAA${definition.partnerCode.slice(-5)}A1Z5`,
        bankName: 'State Bank of India',
        bankAccountName: definition.businessName,
        bankAccountNo: `3785${definition.partnerCode.slice(-5)}`,
        bankIfsc: 'SBIN0009876',
        category: definition.category,
        level: definition.level,
        approvalStatus: definition.approvalStatus,
        auditStatus: definition.auditStatus,
        maxCapacityHours: definition.maxCapacityHours,
        paymentTermsDays: 30,
        createdById: gridxHeadId,
      },
      update: {},
    });
    partners.push(partner);

    for (const process of definition.capabilities) {
      await prisma.partnerCapability.upsert({
        where: { partnerId_process: { partnerId: partner.id, process } },
        create: {
          partnerId: partner.id,
          process,
          isCapable: true,
          isApproved: true,
          monthlyCapacityHours: definition.maxCapacityHours / 3,
          maxWeightKg: 500,
        },
        update: { isApproved: true },
      });
    }

    const existingMachines = await prisma.partnerMachine.count({ where: { partnerId: partner.id } });
    if (existingMachines === 0) {
      await prisma.partnerMachine.createMany({
        data: [
          {
            partnerId: partner.id,
            machineType: 'MIG welding machine',
            make: 'ESAB',
            capacity: '400 A',
            quantity: 3,
          },
          {
            partnerId: partner.id,
            machineType: 'Radial drilling machine',
            make: 'Bharat',
            capacity: '40 mm',
            quantity: 1,
          },
        ],
      });
    }

    for (const [index, roleCode] of PARTNER_ROLE_CODES.entries()) {
      const roleId = roleIds.get(roleCode);
      if (!roleId) continue;
      const phone = `${definition.phone.slice(0, 8)}${index}${index}`;
      await prisma.user.upsert({
        where: { phone },
        create: {
          name:
            roleCode === 'PARTNER_OWNER'
              ? definition.ownerName
              : `${definition.businessName} ${roleCode === 'PARTNER_SUPERVISOR' ? 'Supervisor' : 'Worker'}`,
          phone,
          email: roleCode === 'PARTNER_OWNER' ? definition.email : undefined,
          roleId,
          userType: 'PARTNER',
          status: 'ACTIVE',
          partnerId: partner.id,
          language: 'HI',
          passwordHash,
          passwordUpdatedAt: new Date(),
        },
        update: { passwordHash, status: 'ACTIVE' },
      });
    }

    // A partner is only on a component's approved list if they can actually run its primary
    // process — the same rule the API and the CSV importer enforce. Approving everyone for
    // everything would make the allocation engine, the capability matrix and the concentration
    // report meaningless at pilot scale.
    const capableComponents = components.filter((component) =>
      definition.capabilities.includes(component.primaryProcess),
    );

    for (const component of capableComponents) {
      await prisma.approvedPartnerComponent.upsert({
        where: { componentId_partnerId: { componentId: component.id, partnerId: partner.id } },
        create: {
          componentId: component.id,
          partnerId: partner.id,
          approvedBy: gridxHeadId,
          firstArticleDone: definition.approvalStatus !== 'TRIAL_APPROVED',
          firstArticleDate: definition.approvalStatus !== 'TRIAL_APPROVED' ? days(-45) : null,
        },
        update: {},
      });

      await prisma.partnerRate.deleteMany({
        where: { partnerId: partner.id, componentId: component.id },
      });
      // Rates vary a little by partner so the allocation engine's cost factor has a real spread
      // to rank on rather than an identical number for everyone.
      const discount = { A: 0.9, B: 0.88, C: 0.84, D: 0.82, SUSPENDED: 0.85 }[definition.category];
      await prisma.partnerRate.create({
        data: {
          companyId: company.id,
          partnerId: partner.id,
          componentId: component.id,
          conversionRate: Math.round((component.standardConversionRate ?? 500) * discount),
          effectiveFrom: days(-90),
          approvedBy: internalUsers.get('PROCUREMENT_USER'),
        },
      });
    }

    const processId = processes.get(definition.capabilities[0]);
    if (processId) {
      const periodStart = days(-3);
      await prisma.capacityDeclaration.upsert({
        where: {
          partnerId_processId_periodStart: { partnerId: partner.id, processId, periodStart },
        },
        create: {
          partnerId: partner.id,
          processId,
          periodType: 'WEEKLY',
          periodStart,
          periodEnd: days(4),
          availableHours: definition.maxCapacityHours / 4,
          availableWorkers: 8,
          availableMachines: 4,
          committedHours: definition.maxCapacityHours / 8,
        },
        update: {},
      });
    }
  }

  // Drawings with a released revision per component (Module 4).
  const revisions = new Map<string, string>();
  for (const component of components) {
    const drawing = await prisma.drawing.upsert({
      where: {
        companyId_drawingNumber: {
          companyId: company.id,
          drawingNumber: `DRG-${component.componentCode}`,
        },
      },
      create: {
        companyId: company.id,
        componentId: component.id,
        drawingNumber: `DRG-${component.componentCode}`,
        title: `${component.name} fabrication drawing`,
        description: 'Released for outsourced manufacturing.',
        uploadedById: engineerId,
      },
      update: {},
    });

    const revision = await prisma.drawingRevision.upsert({
      where: { drawingId_revisionCode: { drawingId: drawing.id, revisionCode: 'A' } },
      create: {
        drawingId: drawing.id,
        revisionCode: 'A',
        revisionNo: 1,
        status: 'RELEASED',
        changeNote: 'Initial release.',
        issueDate: days(-60),
        releasedAt: days(-60),
        createdById: engineerId,
        approvedById: engineerId,
        approvedAt: days(-60),
      },
      update: {},
    });
    await prisma.drawing.update({
      where: { id: drawing.id },
      data: { currentRevisionId: revision.id },
    });
    revisions.set(component.id, revision.id);
  }

  // Inspection plans (Module 9).
  const plans = new Map<string, string>();
  for (const component of components) {
    const existing = await prisma.inspectionPlan.findFirst({
      where: { componentId: component.id, name: `${component.componentCode} final inspection` },
    });
    const plan =
      existing ??
      (await prisma.inspectionPlan.create({
        data: {
          companyId: company.id,
          componentId: component.id,
          name: `${component.componentCode} final inspection`,
          inspectionType: 'FINAL',
          samplingPlan: component.inspectionLevel === 'LEVEL_4_CRITICAL_100_PERCENT' ? '100%' : 'IS 2500 Level II',
          characteristics: {
            create: [
              {
                sequence: 1,
                characteristic: 'Overall length',
                specification: '1200 ± 1.5 mm',
                nominalValue: 1200,
                upperTolerance: 1.5,
                lowerTolerance: -1.5,
                unit: 'mm',
                measuringInstrument: 'Vernier caliper',
                isCritical: true,
              },
              {
                sequence: 2,
                characteristic: 'Weld penetration',
                specification: 'Full penetration, no undercut',
                measuringInstrument: 'Visual + DP test',
                isCritical: true,
              },
              {
                sequence: 3,
                characteristic: 'Surface finish',
                specification: 'Free of spatter, burrs removed',
                measuringInstrument: 'Visual',
              },
            ],
          },
        },
      }));
    plans.set(component.id, plan.id);
  }

  await prisma.numberSequence.upsert({
    where: { key: 'JOB' },
    create: { key: 'JOB', prefix: 'JOB', nextValue: 1, padding: 5 },
    update: {},
  });

  // One job per lifecycle stage so dashboards, queues and reports all have content.
  const jobPlan: {
    suffix: string;
    componentIndex: number;
    partnerIndex: number;
    quantity: number;
    status: JobStatus;
    dueOffset: number;
    accepted?: number;
    rejected?: number;
    /** Days past the due date this job was completed. Negative (the default) is early. */
    lateDays?: number;
  }[] = [
    // Component and partner indices are paired so the partner can actually run the component's
    // primary process — the same pairing the approved list above allows.
    //   components: 0 WELDING · 1 FABRICATION · 2 CUTTING · 3,5,13 MACHINING · 4 BENDING · 14 ASSEMBLY
    //   partners:   0 weld/fab/cut · 1 machining · 2 cutting · 3 machining/fab/weld/assembly
    { suffix: '00001', componentIndex: 0, partnerIndex: 0, quantity: 6, status: 'IN_PRODUCTION', dueOffset: 8 },
    { suffix: '00002', componentIndex: 1, partnerIndex: 3, quantity: 4, status: 'AWAITING_PARTNER_ACCEPTANCE', dueOffset: 14 },
    { suffix: '00003', componentIndex: 2, partnerIndex: 2, quantity: 40, status: 'INSPECTION_REQUESTED', dueOffset: 3 },
    {
      suffix: '00004',
      componentIndex: 2,
      partnerIndex: 0,
      quantity: 60,
      status: 'CLOSED',
      dueOffset: -12,
      accepted: 58,
      rejected: 2,
    },
    { suffix: '00005', componentIndex: 0, partnerIndex: 3, quantity: 2, status: 'MATERIAL_ISSUED', dueOffset: -2 },
    // Enough further history for the scorecard to clear its minimum-jobs floor and for the
    // concentration report and capacity board to show a real spread.
    {
      suffix: '00006',
      componentIndex: 3,
      partnerIndex: 1,
      quantity: 12,
      status: 'CLOSED',
      dueOffset: -30,
      accepted: 12,
    },
    {
      suffix: '00007',
      componentIndex: 5,
      partnerIndex: 1,
      quantity: 20,
      status: 'CLOSED',
      dueOffset: -22,
      accepted: 19,
      rejected: 1,
      // Delivered late, so on-time-in-full is not a flat 100% across the network.
      lateDays: 4,
    },
    {
      suffix: '00008',
      componentIndex: 13,
      partnerIndex: 1,
      quantity: 8,
      status: 'CLOSED',
      dueOffset: -15,
      accepted: 8,
    },
    {
      suffix: '00009',
      componentIndex: 9,
      partnerIndex: 3,
      quantity: 10,
      status: 'CLOSED',
      dueOffset: -26,
      accepted: 10,
    },
    {
      suffix: '00010',
      componentIndex: 6,
      partnerIndex: 3,
      quantity: 14,
      status: 'CLOSED',
      dueOffset: -18,
      accepted: 13,
      rejected: 1,
      lateDays: 2,
    },
    {
      suffix: '00011',
      componentIndex: 14,
      partnerIndex: 3,
      quantity: 25,
      status: 'CLOSED',
      dueOffset: -9,
      accepted: 25,
    },
    { suffix: '00012', componentIndex: 18, partnerIndex: 1, quantity: 30, status: 'IN_PRODUCTION', dueOffset: 6 },
    { suffix: '00013', componentIndex: 7, partnerIndex: 2, quantity: 120, status: 'ACCEPTED', dueOffset: 11 },
    { suffix: '00014', componentIndex: 16, partnerIndex: 0, quantity: 9, status: 'QUALITY_ACCEPTED', dueOffset: -1, accepted: 9 },
    { suffix: '00015', componentIndex: 11, partnerIndex: 0, quantity: 5, status: 'DRAFT', dueOffset: 21 },
  ];

  const jobs = [];
  for (const definition of jobPlan) {
    const component = components[definition.componentIndex];
    const partner = partners[definition.partnerIndex];
    const jobNumber = `JOB-${definition.suffix}`;
    const rate = Math.round((component.standardConversionRate ?? 500) * 0.88);
    const job = await prisma.gridJob.upsert({
      where: { jobNumber },
      create: {
        jobNumber,
        companyId: company.id,
        source: 'MANUAL',
        componentId: component.id,
        productId: product.id,
        drawingRevisionId: revisions.get(component.id),
        inspectionPlanId: plans.get(component.id),
        partnerId: partner.id,
        quantity: definition.quantity,
        acceptedQuantity: definition.accepted ?? 0,
        rejectedQuantity: definition.rejected ?? 0,
        rate,
        dueDate: days(definition.dueOffset),
        plannedStartDate: days(definition.dueOffset - 10),
        status: definition.status,
        priority: definition.dueOffset < 5 ? 'HIGH' : 'NORMAL',
        materialResponsibility: 'OSWAR_SUPPLIED',
        deliveryLocation: 'OSWAR Plant 1, MIDC Nagpur',
        acceptedAt: definition.status === 'AWAITING_PARTNER_ACCEPTANCE' ? null : days(-9),
        productionStartedAt: ['IN_PRODUCTION', 'INSPECTION_REQUESTED', 'CLOSED'].includes(
          definition.status,
        )
          ? days(-7)
          : null,
        // Completion is measured against this job's own due date, not a fixed day, so a
        // back-dated job is on time or late because the plan says so — which is what the
        // on-time-in-full KPI reads.
        completedAt:
          definition.status === 'CLOSED' || definition.status === 'QUALITY_ACCEPTED'
            ? days(definition.dueOffset + (definition.lateDays ?? -1))
            : null,
        closedAt: definition.status === 'CLOSED' ? days(definition.dueOffset + 1) : null,
        createdById: gridxHeadId,
        items: {
          create: [
            {
              componentId: component.id,
              drawingRevisionId: revisions.get(component.id),
              quantity: definition.quantity,
              acceptedQuantity: definition.accepted ?? 0,
              rejectedQuantity: definition.rejected ?? 0,
              rate,
            },
          ],
        },
        assignments: {
          create: [
            {
              partnerId: partner.id,
              assignedById: gridxHeadId,
              accepted: definition.status === 'AWAITING_PARTNER_ACCEPTANCE' ? null : true,
              respondedAt: definition.status === 'AWAITING_PARTNER_ACCEPTANCE' ? null : days(-9),
            },
          ],
        },
      },
      update: {},
      include: { milestones: true },
    });
    jobs.push(job);

    if (job.milestones.length === 0 && definition.status !== 'AWAITING_PARTNER_ACCEPTANCE') {
      await prisma.jobMilestone.createMany({
        data: [
          {
            jobId: job.id,
            type: 'MATERIAL_RECEIVED',
            reportedAt: days(-8),
            remarks: 'Material received against challan.',
          },
          {
            jobId: job.id,
            type: 'PRODUCTION_STARTED',
            reportedAt: days(-7),
            quantityCompleted: 0,
          },
        ],
      });
    }
  }

  // Material issue with acknowledgement for the in-production job (Module 7).
  const materialJob = jobs[0];
  const existingIssue = await prisma.materialIssue.findFirst({ where: { jobId: materialJob.id } });
  if (!existingIssue) {
    const issue = await prisma.materialIssue.create({
      data: {
        challanNumber: 'CHL-00001',
        companyId: company.id,
        jobId: materialJob.id,
        partnerId: materialJob.partnerId as string,
        status: 'ACKNOWLEDGED',
        issueDate: days(-8),
        expectedReturnDate: days(6),
        totalIssueWeightKg: 540,
        vehicleNumber: 'MH31 AB 4455',
        driverName: 'Ashok Yadav',
        createdById: storesId,
        items: {
          create: [
            {
              itemId: items[0].id,
              quantity: 540,
              uom: 'KG',
              issueWeightKg: 540,
              theoreticalQuantity: 495,
              heatNumber: 'HT-88213',
              batchNumber: 'B-2214',
            },
          ],
        },
      },
    });
    await prisma.materialReceiptAcknowledgement.create({
      data: {
        materialIssueId: issue.id,
        receivedWeightKg: 540,
        signatureName: 'Ramesh Deshmukh',
        damageRemarks: null,
        acknowledgedAt: days(-8),
      },
    });
  }

  // A completed invoice trail for the closed job (Module 12).
  const closedJob = jobs.find((job) => job.status === 'CLOSED');
  if (closedJob) {
    const existingInvoice = await prisma.partnerInvoice.findUnique({
      where: { invoiceNumber: 'INV-00001' },
    });
    if (!existingInvoice) {
      const amount = closedJob.acceptedQuantity * closedJob.rate;
      await prisma.partnerInvoice.create({
        data: {
          invoiceNumber: 'INV-00001',
          partnerInvoiceNo: 'SFW/24-25/118',
          companyId: company.id,
          partnerId: closedJob.partnerId as string,
          status: 'FINANCE_APPROVED',
          invoiceDate: days(-8),
          periodFrom: days(-38),
          periodTo: days(-8),
          basicAmount: amount,
          taxAmount: Math.round(amount * 0.18),
          netAmount: amount + Math.round(amount * 0.18),
          quantityVerifiedAt: days(-6),
          qualityVerifiedAt: days(-5),
          materialReconciledAt: days(-4),
          financeApprovedAt: days(-3),
          paymentScheduledFor: days(4),
          items: {
            create: [
              {
                jobId: closedJob.id,
                acceptedQuantity: closedJob.acceptedQuantity,
                conversionRate: closedJob.rate,
                amount,
                description: 'Conversion charges for accepted quantity.',
              },
            ],
          },
        },
      });
    }

    await prisma.materialReconciliation.upsert({
      where: { jobId_itemId: { jobId: closedJob.id, itemId: items[0].id } },
      create: {
        jobId: closedJob.id,
        itemId: items[0].id,
        issuedKg: 420,
        consumedKg: 394,
        scrapReturnedKg: 24,
        unusedReturnedKg: 2,
        status: 'BALANCED',
        reconciledById: storesId,
        reconciledAt: days(-4),
      },
      update: {},
    });
  }

  // Quality history for the inspection queue (Module 9).
  const inspectionJob = jobs.find((job) => job.status === 'INSPECTION_REQUESTED');
  if (inspectionJob && qualityId) {
    const existing = await prisma.inspection.findFirst({ where: { jobId: inspectionJob.id } });
    if (!existing) {
      await prisma.inspection.create({
        data: {
          inspectionNumber: 'INS-00001',
          jobId: inspectionJob.id,
          partnerId: inspectionJob.partnerId,
          inspectionPlanId: plans.get(inspectionJob.componentId),
          type: 'FINAL',
          status: 'ASSIGNED',
          offeredQuantity: inspectionJob.quantity,
          requestedAt: days(-1),
          inspectorId: qualityId,
        },
      });
    }
  }

  await prisma.vehicle.upsert({
    where: { registrationNo: 'MH31 AB 4455' },
    create: {
      registrationNo: 'MH31 AB 4455',
      vehicleType: 'LCV 4 tonne',
      capacityKg: 4000,
      ownerName: 'OSWAR Rotocorp',
      driverName: 'Ashok Yadav',
      driverPhone: '9822200011',
    },
    update: {},
  });

  // Section 7 — settings the platform actually reads. The old `gridx.defaults` blob held four
  // keys under one row that no rule ever consulted; the catalogue in @gridx/shared replaced it.
  await prisma.systemSetting.deleteMany({ where: { key: 'gridx.defaults' } });

  /**
   * Section 18 — two-factor is required for senior roles by default, and this demo dataset turns
   * that off.
   *
   * The seeded admin has no authenticator enrolled, so leaving the default in force would issue an
   * enrolment-only session and make the demo login look broken. Production does not run the seed
   * and therefore keeps the secure default; a pilot turns it back on from Administration →
   * Settings once the real admins have enrolled.
   */
  await prisma.systemSetting.upsert({
    where: { key: 'security.twoFactorRequiredRoles' },
    create: { key: 'security.twoFactorRequiredRoles', value: [] },
    update: { value: [] },
  });

  console.log('Seed complete.');
  console.log(`Internal login: admin@oswar.example / ${DEMO_PASSWORD}`);
  console.log(`Partner login (phone): 98111000 + role index, password ${DEMO_PASSWORD}`);
  console.log(
    'Two-factor enforcement is OFF in seeded data. Turn it on in Administration -> Settings ' +
      'before the pilot goes live.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
