import type { CatalogMake } from '../types'

/**
 * MOCK: Fake make-to-model catalog with indicative maintenance intervals.
 *
 * These values exist only to give the interface a realistic shape and must not
 * be treated as a reference.
 *
 * TODO: The real data source has not been chosen yet (ADR 0004, status
 * "Proposed"). Do not write code that depends on the shape of a specific
 * provider until that decision is recorded.
 */
export const mockCatalog: CatalogMake[] = [
  {
    id: 'fiat',
    name: 'Fiat',
    models: [
      {
        id: 'fiat-panda',
        name: 'Panda',
        years: '2011-2023',
        intervals: [
          { label: 'Cambio olio e filtro', everyMonths: 12, everyKm: 15_000 },
          { label: 'Filtro aria', everyMonths: 24, everyKm: 30_000 },
          { label: 'Cinghia di distribuzione', everyMonths: 60, everyKm: 120_000 },
        ],
      },
      {
        id: 'fiat-500',
        name: '500',
        years: '2007-2024',
        intervals: [
          { label: 'Cambio olio e filtro', everyMonths: 12, everyKm: 15_000 },
          { label: 'Liquido freni', everyMonths: 24 },
        ],
      },
    ],
  },
  {
    id: 'volkswagen',
    name: 'Volkswagen',
    models: [
      {
        id: 'vw-golf',
        name: 'Golf',
        years: '2012-2020',
        intervals: [
          { label: 'Cambio olio e filtro', everyMonths: 12, everyKm: 15_000 },
          { label: 'Filtro abitacolo', everyMonths: 24, everyKm: 30_000 },
          { label: 'Candele', everyKm: 60_000 },
        ],
      },
      {
        id: 'vw-polo',
        name: 'Polo',
        years: '2009-2023',
        intervals: [
          { label: 'Cambio olio e filtro', everyMonths: 12, everyKm: 15_000 },
          { label: 'Liquido freni', everyMonths: 36 },
        ],
      },
    ],
  },
  {
    id: 'toyota',
    name: 'Toyota',
    models: [
      {
        id: 'toyota-yaris',
        name: 'Yaris',
        years: '2020-2025',
        intervals: [
          { label: 'Tagliando programmato', everyMonths: 12, everyKm: 15_000 },
          { label: 'Controllo batteria ibrida', everyMonths: 12 },
        ],
      },
      {
        id: 'toyota-corolla',
        name: 'Corolla',
        years: '2019-2025',
        intervals: [{ label: 'Tagliando programmato', everyMonths: 12, everyKm: 15_000 }],
      },
    ],
  },
  {
    id: 'renault',
    name: 'Renault',
    models: [
      {
        id: 'renault-clio',
        name: 'Clio',
        years: '2012-2024',
        intervals: [
          { label: 'Cambio olio e filtro', everyMonths: 12, everyKm: 20_000 },
          { label: 'Cinghia di distribuzione', everyKm: 120_000 },
        ],
      },
    ],
  },
  {
    id: 'ford',
    name: 'Ford',
    models: [
      {
        id: 'ford-fiesta',
        name: 'Fiesta',
        years: '2013-2023',
        intervals: [
          { label: 'Cambio olio e filtro', everyMonths: 12, everyKm: 20_000 },
          { label: 'Filtro carburante', everyKm: 40_000 },
        ],
      },
    ],
  },
  {
    id: 'peugeot',
    name: 'Peugeot',
    models: [
      {
        id: 'peugeot-208',
        name: '208',
        years: '2012-2024',
        intervals: [
          { label: 'Cambio olio e filtro', everyMonths: 12, everyKm: 20_000 },
          { label: 'Liquido freni', everyMonths: 24 },
        ],
      },
    ],
  },
]

/**
 * Flat make-and-model pairs, so text search can match across both without
 * walking the nested structure on every keystroke.
 */
export const catalogModels = mockCatalog.flatMap((make) =>
  make.models.map((model) => ({ make, model })),
)
