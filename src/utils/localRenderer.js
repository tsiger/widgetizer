import { Liquid } from 'liquidjs';

const engine = new Liquid({ extname: '.liquid' });

export async function renderTemplate(template, data) {
  try {
    return await engine.parseAndRender(template, data);
  } catch (err) {
    console.error('Local rendering error:', err);
    return '';
  }
}
