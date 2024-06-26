const axios = require("axios");
const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");

dotenv.config({ path: "./.env" });

const notion = new Client({ auth: process.env.NOTION_KEY });

const pokeArray = [];

const getPokemons = async () => {
  try {

    const start = 26;
    const end = 50;
    for(let i = start; i <= end; i += 1) {
      const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${i}`);

      const processedName = response.data.name.split(/-/).map(name=>{
        return name[0].toUpperCase()+name.substring(1);
      }).join(" ").
      replace(/^Mr M/,"Mr. M")
        .replace(/^Mime Jr/,"Mime Jr.")
        .replace(/^Mr R/,"Mr. R")
        .replace(/mo O/,"mo-o")
        .replace(/Porygon Z/,"Porygon-Z")
        .replace(/Type Null/, "Type: Null")
        .replace(/Ho Oh/,"Ho-Oh")
        .replace(/Nidoran F/,"Nidoran♀")
        .replace(/Nidoran M/,"Nidoran♂")
        .replace(/Flabebe/,"Flabébé")

      const typesArray = []

      response.data.types.forEach(type => {
        const typeObj = {
          name: type.type.name,
        }
        typesArray.push(typeObj);
      })

      const sprite = !response.data.sprites.front_default ? response.data.sprites.other['official-artwork'].front_default : response.data.sprites.front_default;

      const bulbURL = `https://bulbapedia.bulbagarden.net/wiki/${processedName.replace(' ', '_')}_(Pokémon)`

      const pokeData = {
        name: processedName,
        number: response.data.id,
        types: typesArray,
        hp: response.data.stats[0].base_stat,
        height: response.data.height,
        weight: response.data.weight,
        attack: response.data.stats[1].base_stat,
        defense: response.data.stats[2].base_stat,
        specialAttack: response.data.stats[3].base_stat,
        specialDefense: response.data.stats[4].base_stat,
        speed: response.data.stats[5].base_stat,
        sprite,
        artwork: response.data.sprites.other["official-artwork"].front_default,
        bulbURL,
      };
      console.log(`Fetching ${pokeData.name} from API...`);

      pokeArray.push(pokeData);
    }

    for(let pokemon of pokeArray) {
      const flavor = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.number}`);

      const flavorText = flavor.data.flavor_text_entries.find(({language: { name }}) => name === "en").flavor_text.replace(/\n|\f|\r/g, " ")
      const category = flavor.data.genera.find(({language: { name }}) => name === "en").genus
      const generation = flavor.data.generation.name.split(/-/).pop().toUpperCase()

      pokemon.flavorText = flavorText
      pokemon.category = category
      pokemon.generation = generation

    }

    await createNotionPage(pokeArray);


  } catch (err) {
    console.log(err);
  }

};

getPokemons();

const createNotionPage = async () => {
  for (const pokemon of pokeArray) {
    console.log('Sending data to Notion...')
    const response = await notion.pages.create(
      {
        "cover": {
          "type": "external",
          "external": {
            "url": pokemon.artwork
          }
        },
        "icon": {
          "type": "external",
          "external": {
            "url": pokemon.sprite
          }
        },
        "parent": {
          "type": "database_id",
          "database_id": process.env.NOTION_DB_ID,
        },
        "properties": {
          "Name": {
            "title": [
              {
                "type": "text",
                "text": {
                  "content": pokemon.name,
                },
              },
            ],
          },
          "No":{
            "number": pokemon.number
          },
          "Type":{
            "multi_select":pokemon.types
          },
          "Generation":{
            "select": {
              "name": pokemon.generation
            },
          },
          "Category":{
            "rich_text": [
              {
                "type": "text",
                "text": {
                  "content": pokemon.category
                },
              },
            ]
          },
          "HP": {
            "number": pokemon.hp,
          },
          "Attack": {
            "number": pokemon.attack,
          },
          "Defense": {
            "number": pokemon.defense,
          },
          "Sp. Attack": {
            "number": pokemon.specialAttack,
          },
          "Sp. Defense": {
            "number": pokemon.specialDefense,
          },
          "Speed": {
            "number": pokemon.speed,
          },
          "Height": {
            "number": pokemon.height,
          },
          "Weight": {
            "number": pokemon.weight,
          },
        },
        "children": [
          {
            object:"block",
            type: 'quote',
            quote: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content:pokemon.flavorText
                  }
                }
              ]
            }
          },
          {
            object:"block",
            type: 'divider',
            divider: {}
          },
          {
            "object": "block",
            "type": "bookmark",
            "bookmark": {
              "url": pokemon.bulbURL
            }
          }
        ]
      }
    );

    console.log(response)
  }
};



