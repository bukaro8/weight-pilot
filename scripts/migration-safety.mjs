export function hasRiskyLegacyProfileDrop(pendingMigrations, profilesContainRows) {
  return profilesContainRows && pendingMigrations.some(({sql}) => /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"public"\.)?"profiles"/iu.test(sql));
}
