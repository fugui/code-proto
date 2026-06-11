export interface SubMenuItem {
  path: string;
  label: string;
  icon?: string;
  adminOnly?: boolean;
}

export interface MenuGroup {
  title: string;
  items: SubMenuItem[];
  adminOnly?: boolean;
}

export const menuGroups: MenuGroup[] = [
  {
    title: '接口集成',
    items: [
      { path: '/mr', label: 'MR 推送事件', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
    ]
  }
];

export const menuItems: SubMenuItem[] = [
  { path: '/mr', label: 'MR 推送事件', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
];

export default menuItems;
