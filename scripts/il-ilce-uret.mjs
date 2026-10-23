// İl/ilçe/mahalle listesini turkey-neighbourhoods paketinden JSON'a çıkarır.
import { getCities, getDistrictsByCityCode, getDistrictsAndNeighbourhoodsByCityCode } from "turkey-neighbourhoods";
import { writeFileSync } from "node:fs";

const iller = getCities().map((c) => ({
  kod: c.code,
  ad: c.name,
  ilceler: getDistrictsByCityCode(c.code).sort((a, b) => a.localeCompare(b, "tr")),
  mahalleler: Object.fromEntries(
    Object.entries(getDistrictsAndNeighbourhoodsByCityCode(c.code)).map(([ilce, m]) => [
      ilce,
      [...new Set(m.map((x) => x.replace(/ Mah$/, "")))].sort((a, b) => a.localeCompare(b, "tr")),
    ]),
  ),
}));
writeFileSync(new URL("../data/iller.json", import.meta.url), JSON.stringify(iller));
console.log(iller.length, "il,", iller.reduce((t, i) => t + i.ilceler.length, 0), "ilçe");
