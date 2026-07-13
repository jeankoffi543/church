/** Navigation param lists (CHR-185). Extended per epic as screens are added. */

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Live: undefined;
  Discover: undefined;
  MyChurches: undefined;
};

/** The authed area: the tab navigator + screens pushed over it (CHR-189). */
export type AppStackParamList = {
  Tabs: undefined;
  Donate: undefined;
};
