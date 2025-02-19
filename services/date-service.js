class DateService {
  formater = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "long",
    timeZone: "UTC",
  });

  formatDateTimeString(dateTime) {
    const parsed = new Date(dateTime);
    return this.formater.format(parsed);
  }
}

module.exports = new DateService();