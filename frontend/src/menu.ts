export interface SubMenuItem {
  id?: string;
  path: string;
  label: string;
  headerTitle?: string;
  icon?: string;
  adminOnly?: boolean;
  hidden?: boolean;
}

export interface MenuGroup {
  groupKey?: string;
  title: string;
  adminOnly?: boolean;
  items: SubMenuItem[];
}

export interface ModuleMenuConfig {
  moduleKey: string;
  moduleName: string;
  groups: MenuGroup[];
}

export const protoMenuConfig: ModuleMenuConfig = {
  moduleKey: 'proto',
  moduleName: '事件中心 (Code Proto)',
  groups: [
    {
      title: '接口集成',
      items: [
        { path: '/mr', label: 'MR 推送事件', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
      ]
    }
  ]
};

export const menuGroups: MenuGroup[] = protoMenuConfig.groups;
export const menuItems: SubMenuItem[] = protoMenuConfig.groups.flatMap(group => group.items);

export default protoMenuConfig;

