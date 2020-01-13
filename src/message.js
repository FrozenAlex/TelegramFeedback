function generateMessage(name, message) {
    let locale = process.env.LOCALE || "en"
    let currentDate = new Date();
    // Format date
    let dateString = currentDate.toLocaleDateString(locale, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Format time
    let timeString = currentDate.toLocaleTimeString("ru")
    
    // Return formattes message
    return `
${message}
${name || ""} ${dateString}/ ${timeString}`
}

module.exports = {
    generateMessage
}