const TASK = { N: 10, S_levels: 2, a: 4, R_dec_digits: 16, T: 5 };

const BASE_DIR = "./data";
const PLAINTXT = `${BASE_DIR}/nameuser.txt`;
const META = `${BASE_DIR}/users_meta.json`;
const US_BOOK = `${BASE_DIR}/us_book.txt`;
const ASK_FILE = `${BASE_DIR}/ask.txt`;
const CLOSE_FILE_DEFAULT = `${BASE_DIR}/close.txt`;
const INPUT_FILE_DEFAULT = `${BASE_DIR}/input.txt`;
const OUT_FILE_DEFAULT = `${BASE_DIR}/out.txt`;

module.exports = {
  TASK,
  PLAINTXT,
  META,
  US_BOOK,
  ASK_FILE,
  CLOSE_FILE_DEFAULT,
  INPUT_FILE_DEFAULT,
  OUT_FILE_DEFAULT,
};
