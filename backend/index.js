import express from 'express';
import cors from 'cors';
import { getFilters } from './components/getFilters.js';
import { heroCard } from './components/heroCard.js';
import { getFilteredCars } from './components/getFilteredCars.js';
import { getCarDetails } from './components/getCarDetails.js';
import { deliveryCost } from './components/deliveryCost.js';
import { submitLead } from './components/submitLead.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/filters', getFilters);
app.get('/herocard', heroCard);
app.get('/catalog', getFilteredCars);
app.get('/car/:id', getCarDetails);
app.get('/deliveryCost', deliveryCost);

app.post('/lead', submitLead);

app.get('/', (req, res) => {
  res.json({ status: 'API online' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
