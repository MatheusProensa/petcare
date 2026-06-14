import { getOnboardingSeen, setOnboardingSeen } from '../storage';

export const onboardingRepository = {
  getSeen: getOnboardingSeen,
  setSeen: setOnboardingSeen,
};
