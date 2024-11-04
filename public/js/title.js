const speed = 100;
const maxOpacity = 1;
const padding = 10;

var text = generateRandomChars(padding / 2) + randomizeCase(" motexture.com ") + generateRandomChars(padding / 2);

function generateRandomChars(length) {
  let randomChars = "";
  for (let i = 0; i < length; i++) {
    randomChars += String.fromCharCode(Math.random() * 128);
  }
  return randomChars;
}

function randomizeCase(text) {
  return text.split('').map(char => Math.random() < 0.5 ? char.toLowerCase() : char.toUpperCase()).join('');
}

function typeWriter(i = 0) {
  let htmlContent = '';

  for (let j = 0; j <= i; j++) {
    let distance = i - j;
    let opacityDecrement = distance * 0.04;
    let opacity = Math.max(maxOpacity - opacityDecrement, 0);

    htmlContent += `<span style="opacity: ${opacity};">${text[j]}</span>`;
  }

  document.getElementById("typewriter").innerHTML = htmlContent;

  if (i < text.length - 1) {
    setTimeout(() => typeWriter(i + 1), speed);
  } else {
    text = generateRandomChars(padding / 2) + randomizeCase(" motexture.com ") + generateRandomChars(padding / 2);
    setTimeout(() => typeWriter(0), speed);
  }
}

typeWriter();