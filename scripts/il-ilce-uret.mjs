// İl/ilçe listesini turkey-neighbourhoods paketinden küçük bir JSON'a çıkarır.
import { getCities, getDistrictsByCityCode } from "turkey-neighbourhoods";
import { writeFileSync } from "node:fs";

const iller = getCities().map((c) => ({
  kod: c.code,
  ad: c.name,
  ilceler: getDistrictsByCityCode(c.code).sort((a, b) => a.localeCompare(b, "tr")),
}));
writeFileSync(new URL("../data/iller.json", import.meta.url), JSON.stringify(iller));
console.log(iller.length, "il,", iller.reduce((t, i) => t + i.ilceler.length, 0), "ilçe");
