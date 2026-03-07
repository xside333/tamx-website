/**
 * Общий helper для построения WHERE-условий каталога.
 * Используется как в /catalog, так и в /catalog/models.
 */

/**
 * Принимает query params запроса и возвращает { conditions, params, paramIndex }.
 *
 * @param {object} query - req.query объект
 * @returns {{ conditions: string[], params: any[], paramIndex: number }}
 */
export function buildCatalogFilters(query) {
  const {
    source,
    brand, model, generation, type,
    yearFrom, monthFrom, yearTo, monthTo,
    priceFrom, priceTo,
    mileageFrom, mileageTo,
    hpFrom, hpTo,
    fuelType, bodyColor,
    transmission, bodyType, driveType,
    noDamage, category,
  } = query;

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (source && (source === 'K' || source === 'C')) {
    conditions.push(`source = $${paramIndex++}`);
    params.push(source);
  }

  if (brand) {
    conditions.push(`brand = $${paramIndex++}`);
    params.push(brand);
  }

  if (model) {
    conditions.push(`model = $${paramIndex++}`);
    params.push(model);
  }

  if (generation) {
    conditions.push(`generation = $${paramIndex++}`);
    params.push(generation);
    if (!source) {
      conditions.push(`source = 'K'`);
    }
  }

  if (type) {
    const grades = type.split(',').map(v => v.trim()).filter(Boolean);
    if (grades.length > 0) {
      const placeholders = grades.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`grade_en IN (${placeholders})`);
      params.push(...grades);
      if (!source) {
        conditions.push(`source = 'K'`);
      }
    }
  }

  if (yearFrom) {
    const ymFrom = `${yearFrom}${monthFrom ? monthFrom.padStart(2, '0') : '01'}`;
    conditions.push(`yearmonth_raw >= $${paramIndex++}`);
    params.push(ymFrom);
  }

  if (yearTo) {
    const ymTo = `${yearTo}${monthTo ? monthTo.padStart(2, '0') : '12'}`;
    conditions.push(`yearmonth_raw <= $${paramIndex++}`);
    params.push(ymTo);
  }

  if (priceFrom) {
    conditions.push(`totalprice_rub >= $${paramIndex++}`);
    params.push(parseInt(priceFrom));
  }
  if (priceTo) {
    conditions.push(`totalprice_rub <= $${paramIndex++}`);
    params.push(parseInt(priceTo));
  }

  if (mileageFrom) {
    conditions.push(`mileage >= $${paramIndex++}`);
    params.push(parseInt(mileageFrom));
  }
  if (mileageTo) {
    conditions.push(`mileage <= $${paramIndex++}`);
    params.push(parseInt(mileageTo));
  }

  if (hpFrom) {
    conditions.push(`hp > 0 AND hp >= $${paramIndex++}`);
    params.push(parseInt(hpFrom));
  }
  if (hpTo) {
    conditions.push(`hp > 0 AND hp <= $${paramIndex++}`);
    params.push(parseInt(hpTo));
  }

  if (fuelType) {
    const fuels = fuelType.split(',').map(v => v.trim()).filter(Boolean);
    if (fuels.length > 0) {
      const placeholders = fuels.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`fuel_filter IN (${placeholders})`);
      params.push(...fuels);
    }
  }

  if (bodyColor) {
    const colors = bodyColor.split(',').map(v => v.trim()).filter(Boolean);
    if (colors.length > 0) {
      const placeholders = colors.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`color_filter IN (${placeholders})`);
      params.push(...colors);
    }
  }

  if (transmission) {
    const trans = transmission.split(',').map(v => v.trim()).filter(Boolean);
    if (trans.length > 0) {
      const placeholders = trans.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`transmission IN (${placeholders})`);
      params.push(...trans);
    }
  }

  if (bodyType) {
    const types = bodyType.split(',').map(v => v.trim()).filter(Boolean);
    if (types.length > 0) {
      const placeholders = types.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`body_type IN (${placeholders})`);
      params.push(...types);
    }
  }

  if (driveType) {
    const drives = driveType.split(',').map(v => v.trim()).filter(Boolean);
    if (drives.length > 0) {
      const placeholders = drives.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`drive_type IN (${placeholders})`);
      params.push(...drives);
    }
  }

  if (noDamage === 'true') {
    conditions.push(`(accident_count = 0 OR accident_count IS NULL) AND (accident_cost = 0 OR accident_cost IS NULL)`);
  }

  if (category) {
    const categories = category.split(',').map(v => v.trim()).filter(Boolean);
    if (categories.length > 0) {
      const placeholders = categories.map(() => `$${paramIndex++}`).join(',');
      conditions.push(`category IN (${placeholders})`);
      params.push(...categories);
    }
  }

  return { conditions, params, paramIndex };
}
