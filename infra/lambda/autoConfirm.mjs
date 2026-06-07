export const handler = async (event) => {
  // Auto-confirm all new users
  event.response.autoConfirmUser = true;
  return event;
};
