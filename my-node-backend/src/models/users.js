const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "users_email_key99"
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'users',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "users_email_key",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key1",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key10",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key100",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key101",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key102",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key103",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key104",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key105",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key106",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key107",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key108",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key109",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key11",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key110",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key111",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key112",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key113",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key114",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key115",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key116",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key117",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key118",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key119",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key12",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key120",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key121",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key122",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key123",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key124",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key125",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key126",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key127",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key128",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key129",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key13",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key130",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key131",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key132",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key133",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key134",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key135",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key136",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key137",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key138",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key139",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key14",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key140",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key141",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key142",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key143",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key144",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key145",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key146",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key147",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key148",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key149",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key15",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key150",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key151",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key152",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key153",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key154",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key155",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key156",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key157",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key158",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key159",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key16",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key160",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key161",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key162",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key163",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key164",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key165",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key166",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key167",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key168",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key169",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key17",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key170",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key171",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key172",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key173",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key174",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key175",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key176",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key177",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key178",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key179",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key18",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key180",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key181",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key182",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key183",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key184",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key185",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key186",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key187",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key188",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key189",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key19",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key190",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key191",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key192",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key193",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key194",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key195",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key196",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key197",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key198",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key199",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key2",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key20",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key200",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key201",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key202",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key203",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key204",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key205",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key206",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key207",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key208",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key209",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key21",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key210",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key211",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key212",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key213",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key214",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key215",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key216",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key217",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key218",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key219",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key22",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key220",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key221",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key222",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key223",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key224",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key225",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key226",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key227",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key228",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key229",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key23",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key230",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key231",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key232",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key233",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key234",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key235",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key236",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key237",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key238",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key239",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key24",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key240",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key241",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key242",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key243",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key244",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key245",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key246",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key247",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key248",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key249",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key25",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key250",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key251",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key252",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key253",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key254",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key255",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key256",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key257",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key258",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key259",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key26",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key260",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key261",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key262",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key263",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key264",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key265",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key266",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key267",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key268",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key269",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key27",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key270",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key271",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key272",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key273",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key274",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key275",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key276",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key277",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key278",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key279",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key28",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key280",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key281",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key282",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key283",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key284",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key285",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key286",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key287",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key288",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key289",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key29",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key290",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key291",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key292",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key293",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key294",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key295",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key296",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key297",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key298",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key299",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key3",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key30",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key300",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key31",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key32",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key33",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key34",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key35",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key36",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key37",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key38",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key39",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key4",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key40",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key41",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key42",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key43",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key44",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key45",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key46",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key47",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key48",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key49",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key5",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key50",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key51",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key52",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key53",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key54",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key55",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key56",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key57",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key58",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key59",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key6",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key60",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key61",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key62",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key63",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key64",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key65",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key66",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key67",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key68",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key69",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key7",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key70",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key71",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key72",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key73",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key74",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key75",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key76",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key77",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key78",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key79",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key8",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key80",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key81",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key82",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key83",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key84",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key85",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key86",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key87",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key88",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key89",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key9",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key90",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key91",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key92",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key93",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key94",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key95",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key96",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key97",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key98",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_email_key99",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
