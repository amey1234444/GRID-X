import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * One param list per role. Every stack in a role shares its list so a screen
 * can be pushed from any tab — an inspector opening a job from a rework order
 * should not care which tab they started in.
 */
export type InspectorStackParamList = {
  InspectorTabs: undefined;
  InspectorToday: undefined;
  InspectionQueue: { initialFilter?: 'ALL' | 'TODAY' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' } | undefined;
  InspectionDetail: { id: string; inspectionNumber: string };
  InspectionResults: { id: string; inspectionNumber: string };
  NonConformances: undefined;
  ReworkList: undefined;
  ReworkDetail: { id: string; reworkNumber: string };
  Notifications: undefined;
  Profile: undefined;
};

export type PartnerStackParamList = {
  PartnerTabs: undefined;
  PartnerHome: undefined;
  PartnerJobs: { initialFilter?: 'NEW' | 'ACTIVE' | 'COMPLETED' | 'ALL' } | undefined;
  PartnerJobDetail: { id: string; jobNumber: string };
  PartnerInspections: undefined;
  PartnerMaterials: undefined;
  PartnerMaterialDetail: { id: string; challanNumber: string };
  PartnerDrawings: undefined;
  PartnerRework: undefined;
  PartnerInvoices: undefined;
  PartnerScorecard: undefined;
  PartnerMore: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type InspectorScreenProps<T extends keyof InspectorStackParamList> = NativeStackScreenProps<
  InspectorStackParamList,
  T
>;

export type PartnerScreenProps<T extends keyof PartnerStackParamList> = NativeStackScreenProps<
  PartnerStackParamList,
  T
>;
