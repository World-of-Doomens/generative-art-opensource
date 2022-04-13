const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const {
  layers,
  width,
  height,
  description,
  baseImageUri,
  editionSize,
  startEditionFrom,
  rarityWeights,
  conflictElements
} = require("./input/config.js");
const console = require("console");
const canvas = createCanvas(parseInt(width), parseInt(height));
const ctx = canvas.getContext("2d");

// saves the generated image to the output folder, using the edition count as the name
const saveImage = (_editionCount) => {
  fs.writeFileSync(
    `./output/${_editionCount}.png`,
    canvas.toBuffer("image/png")
  );
};

// adds a signature to the top left corner of the canvas
const signImage = (_sig) => {
  ctx.fillStyle = "#000000";
  ctx.font = "bold 30pt Courier";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(_sig, 40, 40);
};

// generate a random color hue
const genColor = () => {
  let hue = Math.floor(Math.random() * 360);
  let pastel = `hsl(${hue}, 100%, 85%)`;
  return pastel;
};

const drawBackground = () => {
  ctx.fillStyle = genColor();
  ctx.fillRect(0, 0, width, height);
};

// add metadata for individual nft edition
const generateMetadata = (_dna, _edition, _attributesList) => {
  let dateTime = Date.now();
  let tempMetadata = {
    dna: _dna.join(""),
    name: `#${_edition}`,
    description: description,
    image: `${baseImageUri}/${_edition}`,
    edition: _edition,
    date: dateTime,
    attributes: _attributesList,
  };
  return tempMetadata;
};

 // get conflict elements
 const getConflictElements = (element) => {
  if (conflictElements.get(element) != undefined) {
    return conflictElements.get(element)
  }
  return null
}

// prepare attributes for the given element to be used as metadata
const getAttributeForElement = (_element) => {
  let selectedElement = _element.layer.selectedElement;
  let attribute = {
    name: selectedElement.name,
    rarity: selectedElement.rarity,
  };
  return attribute;
};

// loads an image from the layer path
// returns the image in a format usable by canvas
const loadLayerImg = async (_layer) => {
  return new Promise(async (resolve) => {
    const image = await loadImage(`${_layer.selectedElement.path}`);
    resolve({ layer: _layer, loadedImage: image });
  });
};

const drawElement = (_element) => {
  ctx.drawImage(
    _element.loadedImage,
    _element.layer.position.x,
    _element.layer.position.y,
    _element.layer.size.width,
    _element.layer.size.height
  );
};

// check the configured layer to find information required for rendering the layer
// this maps the layer information to the generated dna and prepares it for
// drawing on a canvas
const constructLayerToDna = (_dna = [], _layers = [], _rarity) => {
  let mappedDnaToLayers = _layers.map((layer, index) => {
    let selectedElement = layer.elements.find(element => element.id === _dna[index]);
    return {
      location: layer.location,
      position: layer.position,
      size: layer.size,
      selectedElement: {...selectedElement, rarity: _rarity },
    };
  });
  return mappedDnaToLayers;
};

// check if the given dna is contained within the given dnaList 
// return true if it is, indicating that this dna is already in use and should be recalculated
const isDnaUnique = (_DnaList = [], _dna = []) => {
  let foundDna = _DnaList.find((i) => i.join("") === _dna.join(""));
  return foundDna == undefined ? true : false;
};

// check whether element is conflict or not
const isElementConflict = async (_elements) => {
  var conflicted = false
  // Loop elements
  for (let i = 0; i < _elements.length; i++) {
    let element = _elements[i];
    console.log(`Element is ${element}`)
    let isConflict = conflictElements.has(element)
    console.log(`Conflict? : ${isConflict}`)
    if (isConflict) {
      let listOfConflicts = await getConflictElements(element);
      for (let j = 0; j < listOfConflicts.length; j++) {
        const element = listOfConflicts[j];
        conflicted = _elements.includes(element)
        if (conflicted) {
          break;
        }
      }
      // listOfConflicts.map(conflict => {
      //   let conf = _elements.includes(conflict)
      //   if (conf) {
      //     conflicted = conf
      //     break;
      //   }
      // });
    }
  } 
  return conflicted;
  // get list of conflict elements [/]
  // check whether have conflict element or not [/] 
  // if have -- loop check whether conflict element is exist in the input elements or not []
      // if have -- return 'true' []
      // if not -- return 'false' []
  // if not -- return 'false'[/]

  // get list of conflict elements
  
  // for (let i = 0; i < _elements.length; i++) {
  //   const element = _elements[i];
  //   console.log(`Element: ${element}`)
  //   const conflicts = await getConflictElements(element);
  //   if (conflicts == null || conflicts.length == 0 ) {
  //     continue;
  //   }
  //   console.log(`Conflict Element: ${conflicts}`)
  // }
  // console.log("Should return false")
  // return false
};

const getRandomRarity = (_rarityOptions) => {
  let randomPercent = Math.random() * 100;
  let percentCount = 0;

  for (let i = 0; i <= _rarityOptions.length; i++) {
    percentCount += _rarityOptions[i].percent;
    if (percentCount >= randomPercent) {
      console.log(`use random rarity ${_rarityOptions[i].id}`)
      return _rarityOptions[i].id;
    }
  }
  return _rarityOptions[0].id;
}

// create a dna based on the available layers for the given rarity
// use a random part for each layer
const createDna = (_layers, _rarity) => {
  let randNum = [];
  let randElement = [];
  let _rarityWeight = rarityWeights.find(rw => rw.value === _rarity);
  _layers.forEach((layer) => {
    let num = Math.floor(Math.random() * layer.elementIdsForRarity[_rarity].length);
    if (_rarityWeight && _rarityWeight.layerPercent[layer.id]) {
      // if there is a layerPercent defined, we want to identify which dna to actually use here (instead of only picking from the same rarity)
      let _rarityForLayer = getRandomRarity(_rarityWeight.layerPercent[layer.id]);
      num = Math.floor(Math.random() * layer.elementIdsForRarity[_rarityForLayer].length);
      randElement.push(layer.elements[_rarityForLayer][num].name)
      randNum.push(layer.elementIdsForRarity[_rarityForLayer][num]);
    } else {
      randElement.push(layer.elements[_rarity][num].name)
      randNum.push(layer.elementIdsForRarity[_rarity][num]);
    }
  });
  return [randNum, randElement];
};

// holds which rarity should be used for which image in edition
let rarityForEdition;
// get the rarity for the image by edition number that should be generated
const getRarity = (_editionCount) => {
  if (!rarityForEdition) {
    // prepare array to iterate over
    rarityForEdition = [];
    rarityWeights.forEach((rarityWeight) => {
      for (let i = rarityWeight.from; i <= rarityWeight.to; i++) {
        rarityForEdition.push(rarityWeight.value);
      }
    });
  }
  console.log(editionSize, _editionCount)
  return rarityForEdition[editionSize - _editionCount];
};

const writeMetaData = (_data) => {
  fs.writeFileSync("./output/_metadata.json", _data);
};

// holds which dna has already been used during generation
let dnaListByRarity = {};
// holds metadata for all NFTs
let metadataList = [];
// Create generative art by using the canvas api
const startCreating = async () => {
  console.log('##################');
  console.log('# Generative Art');
  console.log('# - Create your NFT collection');
  console.log('##################');

  console.log();
  console.log('start creating NFTs.')

  // clear meta data from previous run
  writeMetaData("");

  // prepare dnaList object
  rarityWeights.forEach((rarityWeight) => {
    dnaListByRarity[rarityWeight.value] = [];
  });

  // create NFTs from startEditionFrom to editionSize
  let editionCount = startEditionFrom;
  while (editionCount <= editionSize) {
    console.log('-----------------')
    console.log('creating NFT %d of %d', editionCount, editionSize);

    // get rarity from to config to create NFT as
    let rarity = getRarity(editionCount);
    console.log('- rarity: ' + rarity);

    // calculate the NFT dna by getting a random part for each layer/feature 
    // based on the ones available for the given rarity to use during generation
    let [newDna, newElement] = createDna(layers, rarity);

    while (!isDnaUnique(dnaListByRarity[rarity], newDna) || await isElementConflict(newElement)) {
      // recalculate dna as this has been used before.
      console.log('found duplicate DNA ' + newDna.join('-') + ' or found conflict element, recalculate...');
      [newDna, newElement] = createDna(layers, rarity);
    }
    console.log('- dna: ' + newDna.join('-'));

    // propagate information about required layer contained within config into a mapping object
    // = prepare for drawing
    let results = constructLayerToDna(newDna, layers, rarity);
    let loadedElements = [];

    // load all images to be used by canvas
    results.forEach((layer) => {
      // console.log(layer)
      loadedElements.push(loadLayerImg(layer));
    });

    // elements are loaded asynchronously
    // -> await for all to be available before drawing the image
    await Promise.all(loadedElements).then((elementArray) => {
      // create empty image
      ctx.clearRect(0, 0, width, height);
      // draw a random background color
      drawBackground();
      // store information about each layer to add it as meta information
      let attributesList = [];
      // draw each layer
      elementArray.forEach((element) => {
        // console.log(element)
        drawElement(element);
        attributesList.push(getAttributeForElement(element));
      });
      // add an image signature as the edition count to the top left of the image
      signImage(`#${editionCount}`);
      // write the image to the output directory
      saveImage(editionCount);
      let nftMetadata = generateMetadata(newDna, editionCount, attributesList);
      metadataList.push(nftMetadata)
      console.log('- metadata: ' + JSON.stringify(nftMetadata));
      console.log('- edition ' + editionCount + ' created.');
      console.log();
      writeMetaData(JSON.stringify(metadataList));
    });
    dnaListByRarity[rarity].push(newDna);
    editionCount++;
  }
};

// Initiate code
startCreating();