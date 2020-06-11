function generateMessage(name, message) {
  return `
${message}
${name || ""}`
}

module.exports = {
  generateMessage,
}
