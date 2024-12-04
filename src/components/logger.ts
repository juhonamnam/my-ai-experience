export const logger = (...messages: any) => {
  if (process.env.NODE_ENV === "production") return;
  console.log(...messages);
};
