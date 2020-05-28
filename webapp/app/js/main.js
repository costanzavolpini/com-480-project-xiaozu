$('#menuList a').on('click', function (e) {
  e.preventDefault()
  $(this).tab('show')
})



var introguide = introJs();

introguide.onchange(function(targetElement) {
  if(targetElement.id == "studentNameAutocomplete"){
    targetElement.click();
    var word = "Volpini Costanza";
    var n = 0;
    var x = targetElement;
    var v = "";
    $(".tt-menu")[0].classList.add("tt-open");
    $(".tt-menu")[0].setAttribute("style", "display: block");
    (function loop() {
      v += word[n];
      $(".typeahead").typeahead('val', v)
      if (++n < word.length) {
        setTimeout(loop, 300);
      } else {
        $(".tt-selectable")[0].click()
      }
    })();

  }
  else {
    if(targetElement.id != "start-the-tutorial")
    targetElement.click();
  }
});


introguide.setOptions({
  'showButtons': false,
  steps: [
      // {
      //   element: '.btn-start',
      //   intro: 'We will guide you around our website for a full immersive experience. <br><br>Use the arrow keys for navigation or hit ESC to exit.',
      //   position: 'bottom'
      // },
      // {
      //   element: '#explore-btn',
      //   intro: 'In this tab you can see which are the popular courses over the years.',
      //   position: 'bottom'
      // },
      // {
      //   element: '#dropdownMenuButton',
      //   intro: 'Select the sections that you want to show on the bubble graph.',
      //   position: 'bottom'
      // },
      // {
      //   element: '#checkbox-tutorial',
      //   intro: 'Check/Uncheck to show/hide a section from the graph.',
      //   position: 'bottom'
      // },
      // {
      //   element: '#slide-tutorial',
      //   intro: 'Slide to navigate over different years.',
      //   position: 'bottom'
      // },
      // {
      //   element: '#statistic-tutorial-bubble',
      //   intro: 'Here you can see some statistics.',
      //   position: 'bottom'
      // },
      {
        element: '#network-btn',
        intro: 'In this tab you can explore suggested courses for a specific student.',
        position: 'bottom'
      },
      {
        element: '#studentNameAutocomplete',
        intro: 'Insert the student name and click the corresponding one from the menu.',
        position: 'bottom'
      },
      {
        element: '#slide-courses',
        intro: 'Click here to see which courses are you doing.',
        position: 'bottom'
      },
      // add explanation on lock and unlock
      // {
      //   element: '#small_lock_button_0',
      //   intro: 'Click here to unlock a course. Do it anytime you don't want to see courses related to this one. Like when you didn't enjoy the course!',
      //   position: 'bottom'
      // },
      // add explanation on lock and unlock
      // {
      //   element: '#small_lock_button_0',
      //   intro: 'Click here again to lock it.',
      //   position: 'bottom'
      // },
      {
        element: '#slide-courses',
        intro: 'Click here to hide the courses.',
        position: 'bottom'
      },
      // check how pick 1st element
      // {
      //   element: '.circle-tutorial',
      //   intro: 'Click on a node to see its statistics and (un)lock it.',
      //   position: 'bottom'
      // },
      //
      // {
      //   element: '#statistics-network',
      //   intro: 'Here you can find all the statistic for a course.',
      //   position: 'bottom'
      // },
      // {
      //   element: '#lock_button',
      //   intro: 'Click the icon to unlock it. Enjoy our application!',
      //   position: 'bottom'
      // }

      

      

     
  ]
});


$('#slide-courses').click(function (e) {
  var contentBtn = e.currentTarget;
  var toExpand = false;
  if(contentBtn.innerHTML.includes("Show")){
    contentBtn.innerHTML = `<i class="fas fa-columns"></i> Hide
    courses done`;
    toExpand = true;
  } else {
    contentBtn.innerHTML = `<i class="fas fa-columns"></i> Show
    courses done`;
    toExpand = false;
  }

  var $marginLefty = $("#selected-courses");
  $marginLefty.animate({
    marginLeft: toExpand ? "55%" : "100%" });
  });

  $('#start-the-tutorial').on('click', function (e) {
    introguide.start();
  })


q = d3.queue();

// Keeping track of which courses have been locked
locked_courses = []
saved_student_name = ""
