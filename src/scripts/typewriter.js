const roles = [
  "Mobile & Web Developer",
  "AI & Machine Learning Enthusiast",
  "Building Seamless Digital Experiences"
];

let i = 0, j = 0, dir = 1;
let currentTimeout;

function tick(el) {
  if (!document.getElementById('typewriter')) return; // Stop if navigated away
  
  el.textContent = roles[i].slice(0, j);
  
  if (dir === 1) {
    if (j === roles[i].length) {
      dir = -1; 
      currentTimeout = setTimeout(() => tick(el), 2000); 
      return; 
    }
    j++;
  } else {
    if (j === 0) { 
      dir = 1; 
      i = (i + 1) % roles.length; 
    } else {
      j--;
    }
  }
  
  currentTimeout = setTimeout(() => tick(el), dir === 1 ? 80 : 40);
}

document.addEventListener('astro:page-load', () => {
  const el = document.getElementById('typewriter');
  if (el) {
    if (currentTimeout) clearTimeout(currentTimeout);
    i = 0; j = 0; dir = 1; 
    tick(el);
  }
});
