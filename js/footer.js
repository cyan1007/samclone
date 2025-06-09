const footerMenuList = document.querySelectorAll(
  ".footer-top .inner > ul > li"
);
const footerSubmenuList = document.querySelectorAll(
  ".footer-top .inner .submenu"
);
// console.log(footerMenuList);
// console.log(footerSubmenuList);

footerMenuList.forEach((menu) => {
  menu.addEventListener("mouseenter", () => {
    footerSubmenuList.forEach((submenu) => {
      submenu.style.display = "block";
    });
  });
  menu.addEventListener("mouseleave", () => {
    footerSubmenuList.forEach((submenu) => {
      submenu.style.display = "none";
    });
  });
});
