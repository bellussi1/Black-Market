import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = process.argv[2];
if (!directory) throw new Error('Supply a staging extraction directory, never the active catalog.');
const read = async (file) => JSON.parse(await readFile(resolve(directory, file), 'utf8'));
const ids = new Set((await read('items.json')).map((item) => item.id));
const recipes = await read('recipes.json');
const ref = (value) =>
  typeof value === 'number' ? value : Number(String(value).split(':').at(-1));
const valid = (recipe) =>
  ids.has(ref(recipe.output?.item ?? recipe.output)) &&
  recipe.inputs.every((input) => ids.has(ref(input.item))) &&
  (!recipe.byproductOf || ids.has(ref(recipe.byproductOf)));
const rejected = recipes.filter((recipe) => !valid(recipe));
if (rejected.length) {
  await writeFile(
    resolve(directory, 'invalid-recipe-references.json'),
    JSON.stringify(rejected, null, 2),
  );
  await writeFile(resolve(directory, 'recipes.json'), JSON.stringify(recipes.filter(valid)));
}
console.log(
  JSON.stringify({ rejected: rejected.length, retained: recipes.length - rejected.length }),
);
