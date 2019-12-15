const msPerDay = 86400000.0;
const raShiftPerYearInDeg = 0.014;

function getUTCDays(date) {
  return (date.getTime() / msPerDay) - (date.getTimezoneOffset() / 1440);
}

function getJulian(date) {
  const daysToUnix = 2440587.5;
  return getUTCDays(date) + daysToUnix;
}

function getGMST(date) {
  const jcent = 36525.0;

  const du  = (getJulian(date) - getJulian(new Date('2000-01-01T12:00:00Z')));
  const df = du - Math.floor(du);
  let th = 0.7790572732640 + 0.00273781191135448 * du + df;

  th -= Math.floor(th);
  const tc = du / jcent;

  let gmst = 24.0 * th + (0.014506 + tc * (4612.156534 + tc * (1.3915817 - tc * (0.00000044 + tc * (0.000029956 + tc * 0.0000000368))))) / (54000.0);

  gmst -= Math.floor(gmst / 24.0) * 24.0;
  return gmst;
}

function getLSTInDeg(date, lon) {
  const gmst = getGMST(date);
  const lst = gmst + lon / 15.0 + 240.0;
  const lstHour = lst - Math.floor(lst / 24.0) * 24.0;
  const lstDeg = hoursToDeg(lstHour);
  const lstPrecessionCorreted = raCorrection(lstDeg, date);
  return lstPrecessionCorreted;
}

function hoursToDeg(hours) {
  return hours * 15;
}

function raCorrection(ra, date) {
  // http://star-www.st-and.ac.uk/~fv/webnotes/answer16b.htm
  const diff2000 = (getUTCDays(date) - getUTCDays(new Date('2000-01-01T12:00:00Z'))) / 365.25;
  return ra + diff2000 * raShiftPerYearInDeg;
}
