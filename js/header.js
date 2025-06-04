window.addEventListener("scroll", () => {
  console.log("스크롤했습니다!");
  //  console.log("scrollY: ", window.scrollY);

  if (window.scrollY >= 50) {
    document.querySelector(".header-bottom").classList.add("sticky");
    console.log("header-bottom 고정");
  } else {
    document.querySelector(".header-bottom").classList.remove("sticky");
    console.log("header-bottom 고정해제");
  }
});
