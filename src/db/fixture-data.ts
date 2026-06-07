// Fixture oficial de la Copa Mundial de la FIFA 2026 (Canadá, México y EE.UU.).
//
// Fuente: Wikipedia "2026 FIFA World Cup" y las páginas por grupo / fase final
// (sorteo del 5 de diciembre de 2025). Horarios locales convertidos a UTC.
//   - UTC−4 (costa este, EDT)         -> +4 h
//   - UTC−5 (centro/Houston/KC, CDT)  -> +5 h
//   - UTC−6 (México: CDMX/Guadalajara/Monterrey, CST) -> +6 h
//   - UTC−7 (costa oeste/Vancouver/Seattle, PDT)       -> +7 h
//
// 48 equipos, 12 grupos (A–L), 104 partidos (72 de grupos + 32 de eliminatorias).

export type SeedTeam = {
  fifaCode: string;
  name: string;
  group: string; // "A".."L"
  flag?: string;
};

export type SeedMatch = {
  stage:
    | "group"
    | "round_of_32"
    | "round_of_16"
    | "quarter_final"
    | "semi_final"
    | "third_place"
    | "final";
  groupLabel?: string;
  homeFifaCode?: string; // group stage: known teams
  awayFifaCode?: string;
  homePlaceholder?: string; // knockout: "1A", "2B", "Ganador R32-1"...
  awayPlaceholder?: string;
  kickoffAtUtc: string; // ISO UTC, e.g. "2026-06-11T20:00:00Z"
  venue?: string;
};

export const SEED_TEAMS: SeedTeam[] = [
  // Grupo A
  { fifaCode: "MEX", name: "México", group: "A", flag: "🇲🇽" },
  { fifaCode: "RSA", name: "Sudáfrica", group: "A", flag: "🇿🇦" },
  { fifaCode: "KOR", name: "Corea del Sur", group: "A", flag: "🇰🇷" },
  { fifaCode: "CZE", name: "República Checa", group: "A", flag: "🇨🇿" },
  // Grupo B
  { fifaCode: "CAN", name: "Canadá", group: "B", flag: "🇨🇦" },
  { fifaCode: "BIH", name: "Bosnia y Herzegovina", group: "B", flag: "🇧🇦" },
  { fifaCode: "QAT", name: "Catar", group: "B", flag: "🇶🇦" },
  { fifaCode: "SUI", name: "Suiza", group: "B", flag: "🇨🇭" },
  // Grupo C
  { fifaCode: "BRA", name: "Brasil", group: "C", flag: "🇧🇷" },
  { fifaCode: "MAR", name: "Marruecos", group: "C", flag: "🇲🇦" },
  { fifaCode: "HAI", name: "Haití", group: "C", flag: "🇭🇹" },
  { fifaCode: "SCO", name: "Escocia", group: "C", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  // Grupo D
  { fifaCode: "USA", name: "Estados Unidos", group: "D", flag: "🇺🇸" },
  { fifaCode: "PAR", name: "Paraguay", group: "D", flag: "🇵🇾" },
  { fifaCode: "AUS", name: "Australia", group: "D", flag: "🇦🇺" },
  { fifaCode: "TUR", name: "Turquía", group: "D", flag: "🇹🇷" },
  // Grupo E
  { fifaCode: "GER", name: "Alemania", group: "E", flag: "🇩🇪" },
  { fifaCode: "CUW", name: "Curazao", group: "E", flag: "🇨🇼" },
  { fifaCode: "CIV", name: "Costa de Marfil", group: "E", flag: "🇨🇮" },
  { fifaCode: "ECU", name: "Ecuador", group: "E", flag: "🇪🇨" },
  // Grupo F
  { fifaCode: "NED", name: "Países Bajos", group: "F", flag: "🇳🇱" },
  { fifaCode: "JPN", name: "Japón", group: "F", flag: "🇯🇵" },
  { fifaCode: "SWE", name: "Suecia", group: "F", flag: "🇸🇪" },
  { fifaCode: "TUN", name: "Túnez", group: "F", flag: "🇹🇳" },
  // Grupo G
  { fifaCode: "BEL", name: "Bélgica", group: "G", flag: "🇧🇪" },
  { fifaCode: "EGY", name: "Egipto", group: "G", flag: "🇪🇬" },
  { fifaCode: "IRN", name: "Irán", group: "G", flag: "🇮🇷" },
  { fifaCode: "NZL", name: "Nueva Zelanda", group: "G", flag: "🇳🇿" },
  // Grupo H
  { fifaCode: "ESP", name: "España", group: "H", flag: "🇪🇸" },
  { fifaCode: "CPV", name: "Cabo Verde", group: "H", flag: "🇨🇻" },
  { fifaCode: "KSA", name: "Arabia Saudita", group: "H", flag: "🇸🇦" },
  { fifaCode: "URU", name: "Uruguay", group: "H", flag: "🇺🇾" },
  // Grupo I
  { fifaCode: "FRA", name: "Francia", group: "I", flag: "🇫🇷" },
  { fifaCode: "SEN", name: "Senegal", group: "I", flag: "🇸🇳" },
  { fifaCode: "IRQ", name: "Irak", group: "I", flag: "🇮🇶" },
  { fifaCode: "NOR", name: "Noruega", group: "I", flag: "🇳🇴" },
  // Grupo J
  { fifaCode: "ARG", name: "Argentina", group: "J", flag: "🇦🇷" },
  { fifaCode: "ALG", name: "Argelia", group: "J", flag: "🇩🇿" },
  { fifaCode: "AUT", name: "Austria", group: "J", flag: "🇦🇹" },
  { fifaCode: "JOR", name: "Jordania", group: "J", flag: "🇯🇴" },
  // Grupo K
  { fifaCode: "POR", name: "Portugal", group: "K", flag: "🇵🇹" },
  { fifaCode: "COD", name: "RD del Congo", group: "K", flag: "🇨🇩" },
  { fifaCode: "UZB", name: "Uzbekistán", group: "K", flag: "🇺🇿" },
  { fifaCode: "COL", name: "Colombia", group: "K", flag: "🇨🇴" },
  // Grupo L
  { fifaCode: "ENG", name: "Inglaterra", group: "L", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { fifaCode: "CRO", name: "Croacia", group: "L", flag: "🇭🇷" },
  { fifaCode: "GHA", name: "Ghana", group: "L", flag: "🇬🇭" },
  { fifaCode: "PAN", name: "Panamá", group: "L", flag: "🇵🇦" },
];

export const SEED_MATCHES: SeedMatch[] = [
  // ===================== FASE DE GRUPOS (72) =====================

  // ---- Grupo A ----
  // 11 jun 13:00 UTC-6 -> 19:00Z
  { stage: "group", groupLabel: "A", homeFifaCode: "MEX", awayFifaCode: "RSA", kickoffAtUtc: "2026-06-11T19:00:00Z", venue: "Estadio Azteca, Ciudad de México" },
  // 11 jun 20:00 UTC-6 -> 02:00Z (12 jun)
  { stage: "group", groupLabel: "A", homeFifaCode: "KOR", awayFifaCode: "CZE", kickoffAtUtc: "2026-06-12T02:00:00Z", venue: "Estadio Akron, Zapopan" },
  // 18 jun 12:00 UTC-4 -> 16:00Z
  { stage: "group", groupLabel: "A", homeFifaCode: "CZE", awayFifaCode: "RSA", kickoffAtUtc: "2026-06-18T16:00:00Z", venue: "Mercedes-Benz Stadium, Atlanta" },
  // 18 jun 19:00 UTC-6 -> 01:00Z (19 jun)
  { stage: "group", groupLabel: "A", homeFifaCode: "MEX", awayFifaCode: "KOR", kickoffAtUtc: "2026-06-19T01:00:00Z", venue: "Estadio Akron, Zapopan" },
  // 24 jun 19:00 UTC-6 -> 01:00Z (25 jun)
  { stage: "group", groupLabel: "A", homeFifaCode: "CZE", awayFifaCode: "MEX", kickoffAtUtc: "2026-06-25T01:00:00Z", venue: "Estadio Azteca, Ciudad de México" },
  // 24 jun 19:00 UTC-6 -> 01:00Z (25 jun)
  { stage: "group", groupLabel: "A", homeFifaCode: "RSA", awayFifaCode: "KOR", kickoffAtUtc: "2026-06-25T01:00:00Z", venue: "Estadio BBVA, Guadalupe" },

  // ---- Grupo B ----
  // 12 jun 15:00 UTC-4 -> 19:00Z
  { stage: "group", groupLabel: "B", homeFifaCode: "CAN", awayFifaCode: "BIH", kickoffAtUtc: "2026-06-12T19:00:00Z", venue: "BMO Field, Toronto" },
  // 13 jun 12:00 UTC-7 -> 19:00Z
  { stage: "group", groupLabel: "B", homeFifaCode: "QAT", awayFifaCode: "SUI", kickoffAtUtc: "2026-06-13T19:00:00Z", venue: "Levi's Stadium, Santa Clara" },
  // 18 jun 12:00 UTC-7 -> 19:00Z
  { stage: "group", groupLabel: "B", homeFifaCode: "SUI", awayFifaCode: "BIH", kickoffAtUtc: "2026-06-18T19:00:00Z", venue: "SoFi Stadium, Inglewood" },
  // 18 jun 15:00 UTC-7 -> 22:00Z
  { stage: "group", groupLabel: "B", homeFifaCode: "CAN", awayFifaCode: "QAT", kickoffAtUtc: "2026-06-18T22:00:00Z", venue: "BC Place, Vancouver" },
  // 24 jun 12:00 UTC-7 -> 19:00Z
  { stage: "group", groupLabel: "B", homeFifaCode: "SUI", awayFifaCode: "CAN", kickoffAtUtc: "2026-06-24T19:00:00Z", venue: "BC Place, Vancouver" },
  // 24 jun 12:00 UTC-7 -> 19:00Z
  { stage: "group", groupLabel: "B", homeFifaCode: "BIH", awayFifaCode: "QAT", kickoffAtUtc: "2026-06-24T19:00:00Z", venue: "Lumen Field, Seattle" },

  // ---- Grupo C ----
  // 13 jun 18:00 UTC-4 -> 22:00Z
  { stage: "group", groupLabel: "C", homeFifaCode: "BRA", awayFifaCode: "MAR", kickoffAtUtc: "2026-06-13T22:00:00Z", venue: "MetLife Stadium, East Rutherford" },
  // 13 jun 21:00 UTC-4 -> 01:00Z (14 jun)
  { stage: "group", groupLabel: "C", homeFifaCode: "HAI", awayFifaCode: "SCO", kickoffAtUtc: "2026-06-14T01:00:00Z", venue: "Gillette Stadium, Foxborough" },
  // 19 jun 18:00 UTC-4 -> 22:00Z
  { stage: "group", groupLabel: "C", homeFifaCode: "SCO", awayFifaCode: "MAR", kickoffAtUtc: "2026-06-19T22:00:00Z", venue: "Gillette Stadium, Foxborough" },
  // 19 jun 20:30 UTC-4 -> 00:30Z (20 jun)
  { stage: "group", groupLabel: "C", homeFifaCode: "BRA", awayFifaCode: "HAI", kickoffAtUtc: "2026-06-20T00:30:00Z", venue: "Lincoln Financial Field, Filadelfia" },
  // 24 jun 18:00 UTC-4 -> 22:00Z
  { stage: "group", groupLabel: "C", homeFifaCode: "SCO", awayFifaCode: "BRA", kickoffAtUtc: "2026-06-24T22:00:00Z", venue: "Hard Rock Stadium, Miami Gardens" },
  // 24 jun 18:00 UTC-4 -> 22:00Z
  { stage: "group", groupLabel: "C", homeFifaCode: "MAR", awayFifaCode: "HAI", kickoffAtUtc: "2026-06-24T22:00:00Z", venue: "Mercedes-Benz Stadium, Atlanta" },

  // ---- Grupo D ----
  // 12 jun 18:00 UTC-7 -> 01:00Z (13 jun)
  { stage: "group", groupLabel: "D", homeFifaCode: "USA", awayFifaCode: "PAR", kickoffAtUtc: "2026-06-13T01:00:00Z", venue: "SoFi Stadium, Inglewood" },
  // 13 jun 21:00 UTC-7 -> 04:00Z (14 jun)
  { stage: "group", groupLabel: "D", homeFifaCode: "AUS", awayFifaCode: "TUR", kickoffAtUtc: "2026-06-14T04:00:00Z", venue: "BC Place, Vancouver" },
  // 19 jun 12:00 UTC-7 -> 19:00Z
  { stage: "group", groupLabel: "D", homeFifaCode: "USA", awayFifaCode: "AUS", kickoffAtUtc: "2026-06-19T19:00:00Z", venue: "Lumen Field, Seattle" },
  // 19 jun 20:00 UTC-7 -> 03:00Z (20 jun)
  { stage: "group", groupLabel: "D", homeFifaCode: "TUR", awayFifaCode: "PAR", kickoffAtUtc: "2026-06-20T03:00:00Z", venue: "Levi's Stadium, Santa Clara" },
  // 25 jun 19:00 UTC-7 -> 02:00Z (26 jun)
  { stage: "group", groupLabel: "D", homeFifaCode: "TUR", awayFifaCode: "USA", kickoffAtUtc: "2026-06-26T02:00:00Z", venue: "SoFi Stadium, Inglewood" },
  // 25 jun 19:00 UTC-7 -> 02:00Z (26 jun)
  { stage: "group", groupLabel: "D", homeFifaCode: "PAR", awayFifaCode: "AUS", kickoffAtUtc: "2026-06-26T02:00:00Z", venue: "Levi's Stadium, Santa Clara" },

  // ---- Grupo E ----
  // 14 jun 12:00 UTC-5 -> 17:00Z
  { stage: "group", groupLabel: "E", homeFifaCode: "GER", awayFifaCode: "CUW", kickoffAtUtc: "2026-06-14T17:00:00Z", venue: "NRG Stadium, Houston" },
  // 14 jun 19:00 UTC-4 -> 23:00Z
  { stage: "group", groupLabel: "E", homeFifaCode: "CIV", awayFifaCode: "ECU", kickoffAtUtc: "2026-06-14T23:00:00Z", venue: "Lincoln Financial Field, Filadelfia" },
  // 20 jun 16:00 UTC-4 -> 20:00Z
  { stage: "group", groupLabel: "E", homeFifaCode: "GER", awayFifaCode: "CIV", kickoffAtUtc: "2026-06-20T20:00:00Z", venue: "BMO Field, Toronto" },
  // 20 jun 19:00 UTC-5 -> 00:00Z (21 jun)
  { stage: "group", groupLabel: "E", homeFifaCode: "ECU", awayFifaCode: "CUW", kickoffAtUtc: "2026-06-21T00:00:00Z", venue: "Arrowhead Stadium, Kansas City" },
  // 25 jun 16:00 UTC-4 -> 20:00Z
  { stage: "group", groupLabel: "E", homeFifaCode: "CUW", awayFifaCode: "CIV", kickoffAtUtc: "2026-06-25T20:00:00Z", venue: "Lincoln Financial Field, Filadelfia" },
  // 25 jun 16:00 UTC-4 -> 20:00Z
  { stage: "group", groupLabel: "E", homeFifaCode: "ECU", awayFifaCode: "GER", kickoffAtUtc: "2026-06-25T20:00:00Z", venue: "MetLife Stadium, East Rutherford" },

  // ---- Grupo F ----
  // 14 jun 15:00 UTC-5 -> 20:00Z
  { stage: "group", groupLabel: "F", homeFifaCode: "NED", awayFifaCode: "JPN", kickoffAtUtc: "2026-06-14T20:00:00Z", venue: "AT&T Stadium, Arlington" },
  // 14 jun 20:00 UTC-6 -> 02:00Z (15 jun)
  { stage: "group", groupLabel: "F", homeFifaCode: "SWE", awayFifaCode: "TUN", kickoffAtUtc: "2026-06-15T02:00:00Z", venue: "Estadio BBVA, Guadalupe" },
  // 20 jun 12:00 UTC-5 -> 17:00Z
  { stage: "group", groupLabel: "F", homeFifaCode: "NED", awayFifaCode: "SWE", kickoffAtUtc: "2026-06-20T17:00:00Z", venue: "NRG Stadium, Houston" },
  // 20 jun 22:00 UTC-6 -> 04:00Z (21 jun)
  { stage: "group", groupLabel: "F", homeFifaCode: "TUN", awayFifaCode: "JPN", kickoffAtUtc: "2026-06-21T04:00:00Z", venue: "Estadio BBVA, Guadalupe" },
  // 25 jun 18:00 UTC-5 -> 23:00Z
  { stage: "group", groupLabel: "F", homeFifaCode: "JPN", awayFifaCode: "SWE", kickoffAtUtc: "2026-06-25T23:00:00Z", venue: "AT&T Stadium, Arlington" },
  // 25 jun 18:00 UTC-5 -> 23:00Z
  { stage: "group", groupLabel: "F", homeFifaCode: "TUN", awayFifaCode: "NED", kickoffAtUtc: "2026-06-25T23:00:00Z", venue: "Arrowhead Stadium, Kansas City" },

  // ---- Grupo G ----
  // 15 jun 12:00 UTC-7 -> 19:00Z
  { stage: "group", groupLabel: "G", homeFifaCode: "BEL", awayFifaCode: "EGY", kickoffAtUtc: "2026-06-15T19:00:00Z", venue: "Lumen Field, Seattle" },
  // 15 jun 18:00 UTC-7 -> 01:00Z (16 jun)
  { stage: "group", groupLabel: "G", homeFifaCode: "IRN", awayFifaCode: "NZL", kickoffAtUtc: "2026-06-16T01:00:00Z", venue: "SoFi Stadium, Inglewood" },
  // 21 jun 12:00 UTC-7 -> 19:00Z
  { stage: "group", groupLabel: "G", homeFifaCode: "BEL", awayFifaCode: "IRN", kickoffAtUtc: "2026-06-21T19:00:00Z", venue: "SoFi Stadium, Inglewood" },
  // 21 jun 18:00 UTC-7 -> 01:00Z (22 jun)
  { stage: "group", groupLabel: "G", homeFifaCode: "NZL", awayFifaCode: "EGY", kickoffAtUtc: "2026-06-22T01:00:00Z", venue: "BC Place, Vancouver" },
  // 26 jun 20:00 UTC-7 -> 03:00Z (27 jun)
  { stage: "group", groupLabel: "G", homeFifaCode: "EGY", awayFifaCode: "IRN", kickoffAtUtc: "2026-06-27T03:00:00Z", venue: "Lumen Field, Seattle" },
  // 26 jun 20:00 UTC-7 -> 03:00Z (27 jun)
  { stage: "group", groupLabel: "G", homeFifaCode: "NZL", awayFifaCode: "BEL", kickoffAtUtc: "2026-06-27T03:00:00Z", venue: "BC Place, Vancouver" },

  // ---- Grupo H ----
  // 15 jun 18:00 UTC-4 -> 22:00Z
  { stage: "group", groupLabel: "H", homeFifaCode: "KSA", awayFifaCode: "URU", kickoffAtUtc: "2026-06-15T22:00:00Z", venue: "Hard Rock Stadium, Miami Gardens" },
  // 15 jun 12:00 UTC-4 -> 16:00Z
  { stage: "group", groupLabel: "H", homeFifaCode: "ESP", awayFifaCode: "CPV", kickoffAtUtc: "2026-06-15T16:00:00Z", venue: "Mercedes-Benz Stadium, Atlanta" },
  // 21 jun 12:00 UTC-4 -> 16:00Z
  { stage: "group", groupLabel: "H", homeFifaCode: "ESP", awayFifaCode: "KSA", kickoffAtUtc: "2026-06-21T16:00:00Z", venue: "Mercedes-Benz Stadium, Atlanta" },
  // 21 jun 18:00 UTC-4 -> 22:00Z
  { stage: "group", groupLabel: "H", homeFifaCode: "URU", awayFifaCode: "CPV", kickoffAtUtc: "2026-06-21T22:00:00Z", venue: "Hard Rock Stadium, Miami Gardens" },
  // 26 jun 19:00 UTC-5 -> 00:00Z (27 jun)
  { stage: "group", groupLabel: "H", homeFifaCode: "CPV", awayFifaCode: "KSA", kickoffAtUtc: "2026-06-27T00:00:00Z", venue: "NRG Stadium, Houston" },
  // 26 jun 18:00 UTC-6 -> 00:00Z (27 jun)
  { stage: "group", groupLabel: "H", homeFifaCode: "URU", awayFifaCode: "ESP", kickoffAtUtc: "2026-06-27T00:00:00Z", venue: "Estadio Akron, Zapopan" },

  // ---- Grupo I ----
  // 16 jun 15:00 UTC-4 -> 19:00Z
  { stage: "group", groupLabel: "I", homeFifaCode: "FRA", awayFifaCode: "SEN", kickoffAtUtc: "2026-06-16T19:00:00Z", venue: "MetLife Stadium, East Rutherford" },
  // 16 jun 18:00 UTC-4 -> 22:00Z
  { stage: "group", groupLabel: "I", homeFifaCode: "IRQ", awayFifaCode: "NOR", kickoffAtUtc: "2026-06-16T22:00:00Z", venue: "Gillette Stadium, Foxborough" },
  // 22 jun 17:00 UTC-4 -> 21:00Z
  { stage: "group", groupLabel: "I", homeFifaCode: "FRA", awayFifaCode: "IRQ", kickoffAtUtc: "2026-06-22T21:00:00Z", venue: "Lincoln Financial Field, Filadelfia" },
  // 22 jun 20:00 UTC-4 -> 00:00Z (23 jun)
  { stage: "group", groupLabel: "I", homeFifaCode: "NOR", awayFifaCode: "SEN", kickoffAtUtc: "2026-06-23T00:00:00Z", venue: "MetLife Stadium, East Rutherford" },
  // 26 jun 15:00 UTC-4 -> 19:00Z
  { stage: "group", groupLabel: "I", homeFifaCode: "NOR", awayFifaCode: "FRA", kickoffAtUtc: "2026-06-26T19:00:00Z", venue: "Gillette Stadium, Foxborough" },
  // 26 jun 15:00 UTC-4 -> 19:00Z
  { stage: "group", groupLabel: "I", homeFifaCode: "SEN", awayFifaCode: "IRQ", kickoffAtUtc: "2026-06-26T19:00:00Z", venue: "BMO Field, Toronto" },

  // ---- Grupo J ----
  // 16 jun 20:00 UTC-5 -> 01:00Z (17 jun)
  { stage: "group", groupLabel: "J", homeFifaCode: "ARG", awayFifaCode: "ALG", kickoffAtUtc: "2026-06-17T01:00:00Z", venue: "Arrowhead Stadium, Kansas City" },
  // 16 jun 21:00 UTC-7 -> 04:00Z (17 jun)
  { stage: "group", groupLabel: "J", homeFifaCode: "AUT", awayFifaCode: "JOR", kickoffAtUtc: "2026-06-17T04:00:00Z", venue: "Levi's Stadium, Santa Clara" },
  // 22 jun 12:00 UTC-5 -> 17:00Z
  { stage: "group", groupLabel: "J", homeFifaCode: "ARG", awayFifaCode: "AUT", kickoffAtUtc: "2026-06-22T17:00:00Z", venue: "AT&T Stadium, Arlington" },
  // 22 jun 20:00 UTC-7 -> 03:00Z (23 jun)
  { stage: "group", groupLabel: "J", homeFifaCode: "JOR", awayFifaCode: "ALG", kickoffAtUtc: "2026-06-23T03:00:00Z", venue: "Levi's Stadium, Santa Clara" },
  // 27 jun 21:00 UTC-5 -> 02:00Z (28 jun)
  { stage: "group", groupLabel: "J", homeFifaCode: "ALG", awayFifaCode: "AUT", kickoffAtUtc: "2026-06-28T02:00:00Z", venue: "Arrowhead Stadium, Kansas City" },
  // 27 jun 21:00 UTC-5 -> 02:00Z (28 jun)
  { stage: "group", groupLabel: "J", homeFifaCode: "JOR", awayFifaCode: "ARG", kickoffAtUtc: "2026-06-28T02:00:00Z", venue: "AT&T Stadium, Arlington" },

  // ---- Grupo K ----
  // 17 jun 12:00 UTC-5 -> 17:00Z
  { stage: "group", groupLabel: "K", homeFifaCode: "POR", awayFifaCode: "COD", kickoffAtUtc: "2026-06-17T17:00:00Z", venue: "NRG Stadium, Houston" },
  // 17 jun 20:00 UTC-6 -> 02:00Z (18 jun)
  { stage: "group", groupLabel: "K", homeFifaCode: "UZB", awayFifaCode: "COL", kickoffAtUtc: "2026-06-18T02:00:00Z", venue: "Estadio Azteca, Ciudad de México" },
  // 23 jun 12:00 UTC-5 -> 17:00Z
  { stage: "group", groupLabel: "K", homeFifaCode: "POR", awayFifaCode: "UZB", kickoffAtUtc: "2026-06-23T17:00:00Z", venue: "NRG Stadium, Houston" },
  // 23 jun 20:00 UTC-6 -> 02:00Z (24 jun)
  { stage: "group", groupLabel: "K", homeFifaCode: "COL", awayFifaCode: "COD", kickoffAtUtc: "2026-06-24T02:00:00Z", venue: "Estadio Akron, Zapopan" },
  // 27 jun 19:30 UTC-4 -> 23:30Z
  { stage: "group", groupLabel: "K", homeFifaCode: "COL", awayFifaCode: "POR", kickoffAtUtc: "2026-06-27T23:30:00Z", venue: "Hard Rock Stadium, Miami Gardens" },
  // 27 jun 19:30 UTC-4 -> 23:30Z
  { stage: "group", groupLabel: "K", homeFifaCode: "COD", awayFifaCode: "UZB", kickoffAtUtc: "2026-06-27T23:30:00Z", venue: "Mercedes-Benz Stadium, Atlanta" },

  // ---- Grupo L ----
  // 17 jun 15:00 UTC-5 -> 20:00Z
  { stage: "group", groupLabel: "L", homeFifaCode: "ENG", awayFifaCode: "CRO", kickoffAtUtc: "2026-06-17T20:00:00Z", venue: "AT&T Stadium, Arlington" },
  // 17 jun 19:00 UTC-4 -> 23:00Z
  { stage: "group", groupLabel: "L", homeFifaCode: "GHA", awayFifaCode: "PAN", kickoffAtUtc: "2026-06-17T23:00:00Z", venue: "BMO Field, Toronto" },
  // 23 jun 16:00 UTC-4 -> 20:00Z
  { stage: "group", groupLabel: "L", homeFifaCode: "ENG", awayFifaCode: "GHA", kickoffAtUtc: "2026-06-23T20:00:00Z", venue: "Gillette Stadium, Foxborough" },
  // 23 jun 19:00 UTC-4 -> 23:00Z
  { stage: "group", groupLabel: "L", homeFifaCode: "PAN", awayFifaCode: "CRO", kickoffAtUtc: "2026-06-23T23:00:00Z", venue: "BMO Field, Toronto" },
  // 27 jun 17:00 UTC-4 -> 21:00Z
  { stage: "group", groupLabel: "L", homeFifaCode: "PAN", awayFifaCode: "ENG", kickoffAtUtc: "2026-06-27T21:00:00Z", venue: "MetLife Stadium, East Rutherford" },
  // 27 jun 17:00 UTC-4 -> 21:00Z
  { stage: "group", groupLabel: "L", homeFifaCode: "CRO", awayFifaCode: "GHA", kickoffAtUtc: "2026-06-27T21:00:00Z", venue: "Lincoln Financial Field, Filadelfia" },

  // ===================== DIECISEISAVOS / ROUND OF 32 (16) =====================
  // Los emparejamientos siguen la nomenclatura de la FIFA (números de partido 73–88).
  // Placeholders: "1X" = ganador del grupo X, "2X" = segundo del grupo X,
  // "3Y" = uno de los mejores terceros (ver bracket oficial).

  // 73: 2A vs 2B — 28 jun 12:00 UTC-7 -> 19:00Z
  { stage: "round_of_32", homePlaceholder: "2A", awayPlaceholder: "2B", kickoffAtUtc: "2026-06-28T19:00:00Z", venue: "SoFi Stadium, Inglewood" },
  // 74: 1E vs 3 (A/B/C/D/F) — 29 jun 16:30 UTC-4 -> 20:30Z
  { stage: "round_of_32", homePlaceholder: "1E", awayPlaceholder: "3 A/B/C/D/F", kickoffAtUtc: "2026-06-29T20:30:00Z", venue: "Gillette Stadium, Foxborough" },
  // 75: 1F vs 2C — 29 jun 19:00 UTC-6 -> 01:00Z (30 jun)
  { stage: "round_of_32", homePlaceholder: "1F", awayPlaceholder: "2C", kickoffAtUtc: "2026-06-30T01:00:00Z", venue: "Estadio BBVA, Guadalupe" },
  // 76: 1C vs 2F — 29 jun 12:00 UTC-5 -> 17:00Z
  { stage: "round_of_32", homePlaceholder: "1C", awayPlaceholder: "2F", kickoffAtUtc: "2026-06-29T17:00:00Z", venue: "NRG Stadium, Houston" },
  // 77: 1I vs 3 (C/D/F/G/H) — 30 jun 17:00 UTC-4 -> 21:00Z
  { stage: "round_of_32", homePlaceholder: "1I", awayPlaceholder: "3 C/D/F/G/H", kickoffAtUtc: "2026-06-30T21:00:00Z", venue: "MetLife Stadium, East Rutherford" },
  // 78: 2E vs 2I — 30 jun 12:00 UTC-5 -> 17:00Z
  { stage: "round_of_32", homePlaceholder: "2E", awayPlaceholder: "2I", kickoffAtUtc: "2026-06-30T17:00:00Z", venue: "AT&T Stadium, Arlington" },
  // 79: 1A vs 3 (C/E/F/H/I) — 30 jun 19:00 UTC-6 -> 01:00Z (1 jul)
  { stage: "round_of_32", homePlaceholder: "1A", awayPlaceholder: "3 C/E/F/H/I", kickoffAtUtc: "2026-07-01T01:00:00Z", venue: "Estadio Azteca, Ciudad de México" },
  // 80: 1L vs 3 (E/H/I/J/K) — 1 jul 12:00 UTC-4 -> 16:00Z
  { stage: "round_of_32", homePlaceholder: "1L", awayPlaceholder: "3 E/H/I/J/K", kickoffAtUtc: "2026-07-01T16:00:00Z", venue: "Mercedes-Benz Stadium, Atlanta" },
  // 81: 1D vs 3 (B/E/F/I/J) — 1 jul 17:00 UTC-7 -> 00:00Z (2 jul)
  { stage: "round_of_32", homePlaceholder: "1D", awayPlaceholder: "3 B/E/F/I/J", kickoffAtUtc: "2026-07-02T00:00:00Z", venue: "Levi's Stadium, Santa Clara" },
  // 82: 1G vs 3 (A/E/H/I/J) — 1 jul 13:00 UTC-7 -> 20:00Z
  { stage: "round_of_32", homePlaceholder: "1G", awayPlaceholder: "3 A/E/H/I/J", kickoffAtUtc: "2026-07-01T20:00:00Z", venue: "Lumen Field, Seattle" },
  // 83: 2K vs 2L — 2 jul 19:00 UTC-4 -> 23:00Z
  { stage: "round_of_32", homePlaceholder: "2K", awayPlaceholder: "2L", kickoffAtUtc: "2026-07-02T23:00:00Z", venue: "BMO Field, Toronto" },
  // 84: 1H vs 2J — 2 jul 12:00 UTC-7 -> 19:00Z
  { stage: "round_of_32", homePlaceholder: "1H", awayPlaceholder: "2J", kickoffAtUtc: "2026-07-02T19:00:00Z", venue: "SoFi Stadium, Inglewood" },
  // 85: 1B vs 3 (E/F/G/I/J) — 2 jul 20:00 UTC-7 -> 03:00Z (3 jul)
  { stage: "round_of_32", homePlaceholder: "1B", awayPlaceholder: "3 E/F/G/I/J", kickoffAtUtc: "2026-07-03T03:00:00Z", venue: "BC Place, Vancouver" },
  // 86: 1J vs 2H — 3 jul 18:00 UTC-4 -> 22:00Z
  { stage: "round_of_32", homePlaceholder: "1J", awayPlaceholder: "2H", kickoffAtUtc: "2026-07-03T22:00:00Z", venue: "Hard Rock Stadium, Miami Gardens" },
  // 87: 1K vs 3 (D/E/I/J/L) — 3 jul 20:30 UTC-5 -> 01:30Z (4 jul)
  { stage: "round_of_32", homePlaceholder: "1K", awayPlaceholder: "3 D/E/I/J/L", kickoffAtUtc: "2026-07-04T01:30:00Z", venue: "Arrowhead Stadium, Kansas City" },
  // 88: 2D vs 2G — 3 jul 13:00 UTC-5 -> 18:00Z
  { stage: "round_of_32", homePlaceholder: "2D", awayPlaceholder: "2G", kickoffAtUtc: "2026-07-03T18:00:00Z", venue: "AT&T Stadium, Arlington" },

  // ===================== OCTAVOS / ROUND OF 16 (8) =====================
  // 89: G74 vs G77 — 4 jul 17:00 UTC-4 -> 21:00Z
  { stage: "round_of_16", homePlaceholder: "Ganador R32-74", awayPlaceholder: "Ganador R32-77", kickoffAtUtc: "2026-07-04T21:00:00Z", venue: "Lincoln Financial Field, Filadelfia" },
  // 90: G73 vs G75 — 4 jul 12:00 UTC-5 -> 17:00Z
  { stage: "round_of_16", homePlaceholder: "Ganador R32-73", awayPlaceholder: "Ganador R32-75", kickoffAtUtc: "2026-07-04T17:00:00Z", venue: "NRG Stadium, Houston" },
  // 91: G76 vs G78 — 5 jul 16:00 UTC-4 -> 20:00Z
  { stage: "round_of_16", homePlaceholder: "Ganador R32-76", awayPlaceholder: "Ganador R32-78", kickoffAtUtc: "2026-07-05T20:00:00Z", venue: "MetLife Stadium, East Rutherford" },
  // 92: G79 vs G80 — 5 jul 18:00 UTC-6 -> 00:00Z (6 jul)
  { stage: "round_of_16", homePlaceholder: "Ganador R32-79", awayPlaceholder: "Ganador R32-80", kickoffAtUtc: "2026-07-06T00:00:00Z", venue: "Estadio Azteca, Ciudad de México" },
  // 93: G83 vs G84 — 6 jul 14:00 UTC-5 -> 19:00Z
  { stage: "round_of_16", homePlaceholder: "Ganador R32-83", awayPlaceholder: "Ganador R32-84", kickoffAtUtc: "2026-07-06T19:00:00Z", venue: "AT&T Stadium, Arlington" },
  // 94: G81 vs G82 — 6 jul 17:00 UTC-7 -> 00:00Z (7 jul)
  { stage: "round_of_16", homePlaceholder: "Ganador R32-81", awayPlaceholder: "Ganador R32-82", kickoffAtUtc: "2026-07-07T00:00:00Z", venue: "Lumen Field, Seattle" },
  // 95: G86 vs G88 — 7 jul 12:00 UTC-4 -> 16:00Z
  { stage: "round_of_16", homePlaceholder: "Ganador R32-86", awayPlaceholder: "Ganador R32-88", kickoffAtUtc: "2026-07-07T16:00:00Z", venue: "Mercedes-Benz Stadium, Atlanta" },
  // 96: G85 vs G87 — 7 jul 13:00 UTC-7 -> 20:00Z
  { stage: "round_of_16", homePlaceholder: "Ganador R32-85", awayPlaceholder: "Ganador R32-87", kickoffAtUtc: "2026-07-07T20:00:00Z", venue: "BC Place, Vancouver" },

  // ===================== CUARTOS / QUARTER-FINALS (4) =====================
  // 97: G89 vs G90 — 9 jul 16:00 UTC-4 -> 20:00Z
  { stage: "quarter_final", homePlaceholder: "Ganador R16-89", awayPlaceholder: "Ganador R16-90", kickoffAtUtc: "2026-07-09T20:00:00Z", venue: "Gillette Stadium, Foxborough" },
  // 98: G93 vs G94 — 10 jul 12:00 UTC-7 -> 19:00Z
  { stage: "quarter_final", homePlaceholder: "Ganador R16-93", awayPlaceholder: "Ganador R16-94", kickoffAtUtc: "2026-07-10T19:00:00Z", venue: "SoFi Stadium, Inglewood" },
  // 99: G91 vs G92 — 11 jul 17:00 UTC-4 -> 21:00Z
  { stage: "quarter_final", homePlaceholder: "Ganador R16-91", awayPlaceholder: "Ganador R16-92", kickoffAtUtc: "2026-07-11T21:00:00Z", venue: "Hard Rock Stadium, Miami Gardens" },
  // 100: G95 vs G96 — 11 jul 20:00 UTC-5 -> 01:00Z (12 jul)
  { stage: "quarter_final", homePlaceholder: "Ganador R16-95", awayPlaceholder: "Ganador R16-96", kickoffAtUtc: "2026-07-12T01:00:00Z", venue: "Arrowhead Stadium, Kansas City" },

  // ===================== SEMIFINALES / SEMI-FINALS (2) =====================
  // 101: G97 vs G98 — 14 jul 14:00 UTC-5 -> 19:00Z
  { stage: "semi_final", homePlaceholder: "Ganador CF-97", awayPlaceholder: "Ganador CF-98", kickoffAtUtc: "2026-07-14T19:00:00Z", venue: "AT&T Stadium, Arlington" },
  // 102: G99 vs G100 — 15 jul 15:00 UTC-4 -> 19:00Z
  { stage: "semi_final", homePlaceholder: "Ganador CF-99", awayPlaceholder: "Ganador CF-100", kickoffAtUtc: "2026-07-15T19:00:00Z", venue: "Mercedes-Benz Stadium, Atlanta" },

  // ===================== TERCER PUESTO / THIRD PLACE (1) =====================
  // 103: Perdedor 101 vs Perdedor 102 — 18 jul 17:00 UTC-4 -> 21:00Z
  { stage: "third_place", homePlaceholder: "Perdedor SF-101", awayPlaceholder: "Perdedor SF-102", kickoffAtUtc: "2026-07-18T21:00:00Z", venue: "Hard Rock Stadium, Miami Gardens" },

  // ===================== FINAL (1) =====================
  // 104: Ganador 101 vs Ganador 102 — 19 jul 15:00 UTC-4 -> 19:00Z
  { stage: "final", homePlaceholder: "Ganador SF-101", awayPlaceholder: "Ganador SF-102", kickoffAtUtc: "2026-07-19T19:00:00Z", venue: "MetLife Stadium, East Rutherford" },
];
