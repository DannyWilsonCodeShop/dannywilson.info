const STUDY_MAP_TOPICS = [
  {
    "id": 1,
    "title": "Jim Crow Laws & Racial Oppression",
    "chapter": 11,
    "unit": 5,
    "year": "1877-1965"
  },
  {
    "id": 2,
    "title": "The Great Migration Begins",
    "chapter": 11,
    "unit": 5,
    "year": "1915-1940"
  },
  {
    "id": 3,
    "title": "Black Population Growth in Northern Cities",
    "chapter": 11,
    "unit": 5,
    "year": "1910-1930"
  },
  {
    "id": 4,
    "title": "Push-Pull Factors of Migration",
    "chapter": 11,
    "unit": 5,
    "year": "1915-1970"
  },
  {
    "id": 5,
    "title": "Second Wave of the Great Migration",
    "chapter": 11,
    "unit": 5,
    "year": "1940-1970"
  },
  {
    "id": 6,
    "title": "Woodrow Wilson & Federal Segregation",
    "chapter": 12,
    "unit": 5,
    "year": "1913-1921"
  },
  {
    "id": 7,
    "title": "The Birth of a Nation & Propaganda",
    "chapter": 12,
    "unit": 5,
    "year": "1915"
  },
  {
    "id": 8,
    "title": "Red Summer & Racial Violence",
    "chapter": 12,
    "unit": 5,
    "year": "1919"
  },
  {
    "id": 9,
    "title": "Plessy v. Ferguson & Separate But Equal",
    "chapter": 12,
    "unit": 5,
    "year": "1896"
  },
  {
    "id": 10,
    "title": "Booker T. Washington & Industrial Education",
    "chapter": 13,
    "unit": 5,
    "year": "1895-1915"
  },
  {
    "id": 11,
    "title": "W.E.B. Du Bois & The Talented Tenth",
    "chapter": 13,
    "unit": 5,
    "year": "1903-1963"
  },
  {
    "id": 12,
    "title": "Marcus Garvey & UNIA",
    "chapter": 13,
    "unit": 5,
    "year": "1914-1927"
  },
  {
    "id": 13,
    "title": "The NAACP & Legal Strategy",
    "chapter": 13,
    "unit": 5,
    "year": "1909"
  },
  {
    "id": 14,
    "title": "The Green Book & Safe Travel",
    "chapter": 13,
    "unit": 5,
    "year": "1936-1966"
  },
  {
    "id": 15,
    "title": "The Harlem Renaissance",
    "chapter": 14,
    "unit": 5,
    "year": "1920s-1930s"
  },
  {
    "id": 16,
    "title": "Langston Hughes & Literary Voice",
    "chapter": 14,
    "unit": 5,
    "year": "1920-1967"
  },
  {
    "id": 17,
    "title": "The Black Church as Institution",
    "chapter": 15,
    "unit": 5,
    "year": "1700s-present"
  },
  {
    "id": 18,
    "title": "The Church & Civil Rights Organizing",
    "chapter": 15,
    "unit": 5,
    "year": "1950s-1960s"
  },
  {
    "id": 19,
    "title": "Gospel Music & Cultural Expression",
    "chapter": 15,
    "unit": 5,
    "year": "1930s-present"
  },
  {
    "id": 20,
    "title": "Brown v. Board of Education",
    "chapter": 16,
    "unit": 6,
    "year": "1954"
  },
  {
    "id": 21,
    "title": "Emmett Till & the Spark",
    "chapter": 16,
    "unit": 6,
    "year": "1955"
  },
  {
    "id": 22,
    "title": "Rosa Parks & Montgomery Bus Boycott",
    "chapter": 16,
    "unit": 6,
    "year": "1955-1956"
  },
  {
    "id": 23,
    "title": "Dr. Martin Luther King Jr. & Nonviolence",
    "chapter": 16,
    "unit": 6,
    "year": "1955-1968"
  },
  {
    "id": 24,
    "title": "Little Rock Nine",
    "chapter": 16,
    "unit": 6,
    "year": "1957"
  },
  {
    "id": 25,
    "title": "SCLC Formation",
    "chapter": 16,
    "unit": 6,
    "year": "1957"
  },
  {
    "id": 26,
    "title": "Sit-Ins & Student Activism",
    "chapter": 16,
    "unit": 6,
    "year": "1960"
  },
  {
    "id": 27,
    "title": "SNCC & Student Organizing",
    "chapter": 16,
    "unit": 6,
    "year": "1960"
  },
  {
    "id": 28,
    "title": "Birmingham Children's Crusade",
    "chapter": 17,
    "unit": 6,
    "year": "1963"
  },
  {
    "id": 29,
    "title": "Bull Connor & National Outrage",
    "chapter": 17,
    "unit": 6,
    "year": "1963"
  },
  {
    "id": 30,
    "title": "Freedom Riders",
    "chapter": 18,
    "unit": 6,
    "year": "1961"
  },
  {
    "id": 31,
    "title": "March on Washington",
    "chapter": 18,
    "unit": 6,
    "year": "1963"
  },
  {
    "id": 32,
    "title": "Freedom Summer & Voter Registration",
    "chapter": 18,
    "unit": 6,
    "year": "1964"
  },
  {
    "id": 33,
    "title": "Civil Rights Act of 1964",
    "chapter": 18,
    "unit": 6,
    "year": "1964"
  },
  {
    "id": 34,
    "title": "Selma & Voting Rights Act",
    "chapter": 18,
    "unit": 6,
    "year": "1965"
  },
  {
    "id": 35,
    "title": "Assassination of Dr. King",
    "chapter": 18,
    "unit": 6,
    "year": "1968"
  },
  {
    "id": 36,
    "title": "Fannie Lou Hamer & Voting Rights",
    "chapter": 19,
    "unit": 6,
    "year": "1962-1977"
  },
  {
    "id": 37,
    "title": "Medgar & Myrlie Evers",
    "chapter": 19,
    "unit": 6,
    "year": "1963"
  },
  {
    "id": 38,
    "title": "Black Panther Party",
    "chapter": 19,
    "unit": 6,
    "year": "1966"
  },
  {
    "id": 39,
    "title": "Convict Lease System",
    "chapter": 20,
    "unit": 7,
    "year": "1865-1940s"
  },
  {
    "id": 40,
    "title": "Texas Capitol & Forced Labor",
    "chapter": 20,
    "unit": 7,
    "year": "1882-1888"
  },
  {
    "id": 41,
    "title": "Compromise of 1877 & End of Reconstruction",
    "chapter": 20,
    "unit": 7,
    "year": "1877"
  },
  {
    "id": 42,
    "title": "HBCUs & Black Higher Education",
    "chapter": 21,
    "unit": 7,
    "year": "1837-present"
  },
  {
    "id": 43,
    "title": "Financial Literacy & Wealth Building",
    "chapter": 21,
    "unit": 7,
    "year": "present"
  },
  {
    "id": 44,
    "title": "2019 HBCU Funding Legislation",
    "chapter": 21,
    "unit": 7,
    "year": "2019"
  },
  {
    "id": 45,
    "title": "Annie Turnbo Malone & Poro Company",
    "chapter": 22,
    "unit": 7,
    "year": "1902"
  },
  {
    "id": 46,
    "title": "Madam C.J. Walker",
    "chapter": 22,
    "unit": 7,
    "year": "1905-1919"
  },
  {
    "id": 47,
    "title": "Reginald Lewis & Wall Street",
    "chapter": 22,
    "unit": 7,
    "year": "1970-1993"
  },
  {
    "id": 48,
    "title": "Cathy Hughes & Urban One",
    "chapter": 22,
    "unit": 7,
    "year": "1980-present"
  },
  {
    "id": 49,
    "title": "Curtis Robinson & Four Laws",
    "chapter": 22,
    "unit": 7,
    "year": "20th century"
  },
  {
    "id": 50,
    "title": "Mary McLeod Bethune",
    "chapter": 23,
    "unit": 7,
    "year": "1904-1955"
  },
  {
    "id": 51,
    "title": "Berea College & Interracial Education",
    "chapter": 23,
    "unit": 7,
    "year": "1855"
  },
  {
    "id": 52,
    "title": "Executive Order 9981 & Military Desegregation",
    "chapter": 23,
    "unit": 7,
    "year": "1948"
  },
  {
    "id": 53,
    "title": "Barack Obama & the Presidency",
    "chapter": 23,
    "unit": 7,
    "year": "2008"
  },
  {
    "id": 54,
    "title": "The N-Word & Dehumanization",
    "chapter": 24,
    "unit": 7,
    "year": "1700s-present"
  },
  {
    "id": 55,
    "title": "Barriers Against Black Physicians",
    "chapter": 24,
    "unit": 7,
    "year": "1700s-present"
  }
];

const MAP_AWARDS = [
  {
    "id": "first_topic",
    "name": "\ud83c\udf31 First Step",
    "desc": "Complete your first topic",
    "trigger": "topics_completed",
    "value": 1
  },
  {
    "id": "five_topics",
    "name": "\ud83d\udcda Getting Serious",
    "desc": "Complete 5 topics",
    "trigger": "topics_completed",
    "value": 5
  },
  {
    "id": "ten_topics",
    "name": "\ud83d\udd25 On a Roll",
    "desc": "Complete 10 topics",
    "trigger": "topics_completed",
    "value": 10
  },
  {
    "id": "twenty_topics",
    "name": "\u2b50 Halfway There",
    "desc": "Complete 20 topics",
    "trigger": "topics_completed",
    "value": 20
  },
  {
    "id": "unit5_done",
    "name": "\ud83c\udfdb\ufe0f Unit 5 Master",
    "desc": "Complete all Unit 5 topics",
    "trigger": "unit_complete",
    "value": 5
  },
  {
    "id": "unit6_done",
    "name": "\u270a\ufffd\ufffd Unit 6 Master",
    "desc": "Complete all Unit 6 topics",
    "trigger": "unit_complete",
    "value": 6
  },
  {
    "id": "unit7_done",
    "name": "\ud83d\udcb0 Unit 7 Master",
    "desc": "Complete all Unit 7 topics",
    "trigger": "unit_complete",
    "value": 7
  },
  {
    "id": "all_done",
    "name": "\ud83d\udc51 BH365 Scholar",
    "desc": "Complete all 55 topics",
    "trigger": "topics_completed",
    "value": 55
  },
  {
    "id": "perfect_assess",
    "name": "\ud83d\udcaf Perfect Score",
    "desc": "Score 100% on an assessment",
    "trigger": "perfect",
    "value": 1
  },
  {
    "id": "three_perfect",
    "name": "\ud83c\udfaf Sharpshooter",
    "desc": "Get 3 perfect assessments",
    "trigger": "perfect",
    "value": 3
  },
  {
    "id": "streak_5",
    "name": "\u26a1 Lightning",
    "desc": "5 topics in one session",
    "trigger": "session_streak",
    "value": 5
  }
];
