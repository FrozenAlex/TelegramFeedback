function generateMessage(name: string, message: string) {
  return `
${message}
${name || ""}`;
}

module.exports = {
  generateMessage,
};
