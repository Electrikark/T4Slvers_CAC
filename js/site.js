// Recovery printing is optional; the content and links also work without JavaScript.
const printPlan = document.getElementById('print-plan');
if (printPlan) {
  printPlan.hidden = false;
  let foldedBeforePrint = [];
  window.addEventListener('beforeprint', () => {
    foldedBeforePrint = [...document.querySelectorAll('.recovery-options details:not([open])')];
    foldedBeforePrint.forEach(section => { section.open = true; });
  });
  window.addEventListener('afterprint', () => {
    foldedBeforePrint.forEach(section => { section.open = false; });
    foldedBeforePrint = [];
  });
  printPlan.addEventListener('click', () => window.print());
}
