import { pool } from '../utils/dbClient.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

// Главная функция отправки данных
export async function updateData(calculatedData) {
  const client = await pool.connect();
  try {
    logger(`📤 Начинаем отправку ${calculatedData.length} строк в encar_webcatalog`);

    const batchSize = config.insertBatchSize;
    for (let i = 0; i < calculatedData.length; i += batchSize) {
      const batch = calculatedData.slice(i, i + batchSize);

      const values = [];
      const placeholders = batch.map((item, idx) => {
        const baseIdx = idx * 36;
        values.push(
          item.id, item.url, item.cartype, item.firstadvertiseddatetime, item.viewcount,
          item.manufacturername, item.manufacturerenglishname, item.modelgroupname, item.modelgroupenglishname,
          item.modelname, item.modelfilter, item.gradename, item.gradeenglishname, item.yearmonth, item.yearmonth_prod,
          item.mileage, item.colorname, item.colorfilter, item.fuelname, item.fuelfilter, item.price, item.vehicleno,
          item.myaccidentcnt, item.myaccidentcost, item.address, JSON.stringify(item.photo_paths), item.seat_count,
          item.transmission_name, item.trust, item.displacement, JSON.stringify(item.inspection_outers ?? []), item.category,
          item.hp ?? 0, item.totalprice_rub, item.totalprice_usd, JSON.stringify(item.json)
        );
        return `(
          $${baseIdx+1}, $${baseIdx+2}, $${baseIdx+3}, $${baseIdx+4}, $${baseIdx+5}, 
          $${baseIdx+6}, $${baseIdx+7}, $${baseIdx+8}, $${baseIdx+9}, $${baseIdx+10}, 
          $${baseIdx+11}, $${baseIdx+12}, $${baseIdx+13}, $${baseIdx+14}, $${baseIdx+15}, 
          $${baseIdx+16}, $${baseIdx+17}, $${baseIdx+18}, $${baseIdx+19}, $${baseIdx+20}, 
          $${baseIdx+21}, $${baseIdx+22}, $${baseIdx+23}, $${baseIdx+24}, $${baseIdx+25}, 
          $${baseIdx+26}, $${baseIdx+27}, $${baseIdx+28}, $${baseIdx+29}, $${baseIdx+30},
          $${baseIdx+31}, $${baseIdx+32}, $${baseIdx+33}, $${baseIdx+34}, $${baseIdx+35}, $${baseIdx+36}
        )`;
      }).join(',');

      const query = `
        INSERT INTO encar_webcatalog (
          id, url, cartype, firstadvertiseddatetime, viewcount, manufacturername, manufacturerenglishname,
          modelgroupname, modelgroupenglishname, modelname, modelfilter, gradename, gradeenglishname, yearmonth,
          yearmonth_prod, mileage, colorname, colorfilter, fuelname, fuelfilter, price, vehicleno, myaccidentcnt,
          myaccidentcost, address, photo_paths, seat_count, transmission_name, trust,
          displacement, inspection_outers, category, hp, totalprice_rub, totalprice_usd, json
        ) VALUES ${placeholders}
        ON CONFLICT (id) DO UPDATE SET
          url = EXCLUDED.url,
          cartype = EXCLUDED.cartype,
          firstadvertiseddatetime = EXCLUDED.firstadvertiseddatetime,
          viewcount = EXCLUDED.viewcount,
          manufacturername = EXCLUDED.manufacturername,
          manufacturerenglishname = EXCLUDED.manufacturerenglishname,
          modelgroupname = EXCLUDED.modelgroupname,
          modelgroupenglishname = EXCLUDED.modelgroupenglishname,
          modelname = EXCLUDED.modelname,
          modelfilter = EXCLUDED.modelfilter,
          gradename = EXCLUDED.gradename,
          gradeenglishname = EXCLUDED.gradeenglishname,
          yearmonth = EXCLUDED.yearmonth,
          yearmonth_prod = EXCLUDED.yearmonth_prod,
          mileage = EXCLUDED.mileage,
          colorname = EXCLUDED.colorname,
          colorfilter = EXCLUDED.colorfilter,
          fuelname = EXCLUDED.fuelname,
          fuelfilter = EXCLUDED.fuelfilter,
          price = EXCLUDED.price,
          vehicleno = EXCLUDED.vehicleno,
          myaccidentcnt = EXCLUDED.myaccidentcnt,
          myaccidentcost = EXCLUDED.myaccidentcost,
          address = EXCLUDED.address,
          photo_paths = EXCLUDED.photo_paths,
          seat_count = EXCLUDED.seat_count,
          transmission_name = EXCLUDED.transmission_name,
          trust = EXCLUDED.trust,
          displacement = EXCLUDED.displacement,
          inspection_outers = EXCLUDED.inspection_outers,
          category = EXCLUDED.category,
          hp = EXCLUDED.hp,
          totalprice_rub = EXCLUDED.totalprice_rub,
          totalprice_usd = EXCLUDED.totalprice_usd,
          json = EXCLUDED.json,
          updated_at = NOW();
      `;

      await client.query(query, values);
      logger(`✅ Отправлено ${i + batch.length}/${calculatedData.length} строк.`);
    }

    logger('✅ Все данные успешно отправлены!');

  } catch (error) {
    logger(`❌ Ошибка отправки данных: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}
