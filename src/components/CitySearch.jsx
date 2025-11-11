import { useState } from 'react';
import { searchCities } from '../lib/cities';

export default function CitySearch() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);

  async function onInput(v) {
    setQ(v);
    const items = await searchCities(v, { limit: 20 });
    setRes(items);
  }

  return (
    <div>
      <input
        value={q}
        onChange={e => onInput(e.target.value)}
        placeholder='Seoul, KR'
      />
      <ul>
        {res.map((c, i) => (
          <li key={`${c.country}-${c.name}-${i}`}>
            {c.name}, {c.country} ({c.lat}, {c.lon})
          </li>
        ))}
      </ul>
    </div>
  );
}