(function(){

	'use strict';

	var bcrypt = require('bcrypt-nodejs'),
		config   = require('./../../config.js');

	module.exports = function(sequelize, DataTypes) {

			var PlayerModel = sequelize.define('players_table',
			{
				usernameField: {
					type: DataTypes.STRING,
					field: 'username',
					validate: { notEmpty: true },
					roles: { admin: {get: true}	},
					unique: true
				},
				passwordField: {
					type: DataTypes.STRING,
					field: 'password',
					roles: false,
					set: function(val) {
			            var salt = bcrypt.genSaltSync(10),
        					hash = bcrypt.hashSync(val, salt);
        				this.setDataValue('passwordField', hash);
					}
				},
				aliasField: {
					type: DataTypes.STRING,
					field: 'alias',
					defaultValue: 'Anonymous Player'
				},
				emailField: {
					type: DataTypes.STRING,
					field: 'email'
				},
				bioField: {
					type: DataTypes.TEXT,
					field: 'bio'
				},
				locationField: {
					type: DataTypes.STRING,
					field: 'location',
					defaultValue: 'International'
				},
				contractType: {
					type: DataTypes.INTEGER,
					field: 'contract',
					defaultValue: config.enums.contract.FREELANCER
				},
				missionsWonNum: {
					type: DataTypes.INTEGER,
					field: 'missions_won',
					defaultValue: 0
				},
				missionsFailedNum: {
					type: DataTypes.INTEGER,
					field: 'missions_failed',
					defaultValue: 0
				},
				playerTier: { // The Tier of the player in relation to its PMC
					type: DataTypes.INTEGER,
					field: 'tier',
					defaultValue: config.privileges().tiers.user
				},
				playerStatus: {
					type: DataTypes.INTEGER,
					field: 'status',
					defaultValue: 0
				},
				currentFunds: {
					type: DataTypes.FLOAT,
					field: 'funds',
					defaultValue: 0
				},
				tagsField: {
					type: DataTypes.TEXT,
					field: 'tags',
					get: function() {
						var API = require('./../../routes/api.js');
						return API.methods.getPseudoArray(this.getDataValue('tagsField'));
					},
					set: function(val) {
						var API = require('./../../routes/api.js');
						this.setDataValue('tagsField', API.methods.setPseudoArray(val));
					}
				},
				playerPrestige: { // The amount of Prestige, used to shop in stores and other things
					type: DataTypes.INTEGER,
					field: 'prestige',
					defaultValue: 0
				},
				playerPrivilege: { // The player Privilege, which determines what meta-actions the player can do - aka moderator, admin, janitor, etc
					type: DataTypes.INTEGER,
					field: 'privilege',
					defaultValue: config.privileges().tiers.user
				},
				lastIPField: {
					type: DataTypes.STRING,
					field: 'last_ip'
				},
				steamIDField: {
					type: DataTypes.STRING,
					field: 'steam_id'
				},
				privateFields: {
					type: DataTypes.TEXT,
					field: 'private_fields',
					get: function() {
						var API = require('./../../routes/api.js');
						return API.methods.getPseudoArray(this.getDataValue('privateFields'));
					},
					set: function(val) {
						var API = require('./../../routes/api.js');
						this.setDataValue('privateFields', API.methods.setPseudoArray(val));
					}
				},
				privateVisibility: {
					type: DataTypes.STRING,
					field: 'private_visibility',
					defaultValue: 'nobody'
				},
				hashField: {
					type: DataTypes.STRING,
					defaultValue: ''
				}
			},
			{
				name: {
					singular: 'player',
					plural: 'players',
				},
				hooks: {
					beforeCreate: function(model, options) {
						var md5 = require("md5"),
							newHash = (md5((Math.random(9999999))+(new Date()))).substring(0,config.db.hashSize);
						model.setDataValue('hashField', newHash);
					}
				},
				classMethods: {
					blacklistProperties: function(mode, role) {
						switch (mode) {
							case 'query': {
								switch (role) {
									case 'admin': { return []; }
									case 'user': { return ['id', 'updatedAt', 'emailField', 'currentFunds', 'lastIPField', 'privateFields', 'privateVisibility', 'PMCId']; }
									default: { return []; }
								}
							} break;
							case 'creation': { return 'emailField,currentFunds,steamIDField'; }
						}
					},
					whitelistProperties: function(mode, role) {
						switch (mode) {
							case 'query': {
								switch (role) {
									case 'admin': { return []; }
									case 'user': {
 									return [
										'contractField', 'bioField','missionsWonNum','missionsFailedNum',
										'playerTier', 'playerStatus', 'currentFunds', 'playerPrestige', 'playerPrivilege',
										'steamIDField', 'locationField', 'hideComments', 'blockComments', 'PMC'
									]; }
									default: { return []; }
								}
							} break;
						}
					},
					associate: function(models) {
						PlayerModel.belongsTo(models.pmc, {
							onDelete: "CASCADE",
							foreignKey: {
								allowNull: true
							}
						});
						PlayerModel.belongsToMany(models.upgrades, { through: models.player_upgrades });
					}
				},
				instanceMethods: {
					comparePassword: function(pass) {
						return bcrypt.compareSync(pass, this.getDataValue('passwordField'));
					},
					spendFunds: function(amount, done) {
						var funds = this.currentFunds,
							rObject = {
								neededFunds: amount,
								currentFunds: funds,
								valid: (funds >= amount)
							};

						if (funds >= amount) {
							this.update({ currentFunds: (funds - amount) }).then(function() { return done(rObject); });
						} else { return done(rObject); }
					},
					getAllTransactions: function(done) {
						var TransactionHistoryModel = require('./../index.js').getModels().transaction_history,
							thisHash = this.getDataValue('hashField');

						TransactionHistoryModel.findAll(
							{ where: {$or: [{buyerHash: {$eq: thisHash}}, {recipientHash: { $eq: thisHash }},] }}
						).then(function(transactions) {
							return done(transactions);
						});
					},
					getBuyerTransactions: function(done) {
						var TransactionHistoryModel = require('./../index.js').getModels().transaction_history,
							thisHash = this.getDataValue('hashField');

						TransactionHistoryModel.findAll(
							{ where: {buyerHash: thisHash }}
						).then(function(transactions) {
							return done(transactions);
						});
					},
					getRecipientTransactions: function(done) {
						var TransactionHistoryModel = require('./../index.js').getModels().transaction_history,
							thisHash = this.getDataValue('hashField');

						TransactionHistoryModel.findAll(
							{ where: {recipientHash: thisHash }}
						).then(function(transactions) {
							return done(transactions);
						});
					},
					addNewItem: function(p_itemHash, amount, deployed, done) {
						var PlayerItems = require('./../index.js').getModels().player_items,
							thisHash = this.getDataValue('hashField');

						PlayerItems.create({ownerHash: thisHash, itemHash: p_itemHash, amountField: amount, deployedField: (deployed || false)}).then(function(ownedItem) {
							return done(ownedItem);
						});
					},
					getItems: function(done) {
						var PlayerItems = require('./../index.js').getModels().player_items,
							ItemModel = require('./../index.js').getModels().items,
							thisHash = this.getDataValue('hashField');

						PlayerItems.findAll({where: {ownerHash: thisHash}}).then(function(ownedItems) {
							var itemHashes = [];
							for (var i=0; i < ownedItems.length; i++) { itemHashes.push(ownedItems[i].dataValues.itemHash); }

							ItemModel.findAll({where: {hashField: itemHashes}}).then(function(foundOwnedItems) {
								for (var i=0; i < ownedItems.length; i++) { ownedItems[i].dataValues.itemData = foundOwnedItems[i].dataValues; }
								return done(ownedItems);
							});
						});
					},
					hasItem: function(p_itemHash, done) {
						var PlayerItems = require('./../index.js').getModels().player_items,
							thisHash = this.getDataValue('hashField');

						PlayerItems.findOne({where: {ownerHash: thisHash, itemHash: p_itemHash}}).then(function(ownedItem) {
							return done(ownedItem);
						});
					},
					makeSettings: function(done) {
						var PlayerSettings = require('./../index.js').getModels().player_settings,
							thisHash = this.getDataValue('hashField');

						PlayerSettings.create({playerHash: thisHash}).then(function(settings) { return done(settings); });
					},
					getSettings: function(done) {
						var PlayerSettings = require('./../index.js').getModels().player_settings,
							thisHash = this.getDataValue('hashField'),
							thisModel = this;

						PlayerSettings.findOne({where: {playerHash: thisHash}}).then(function(settings) {
							if (settings) {
								return done(settings);
							} else {
								thisModel.makeSettings(function(n_settings) { return done(n_settings); });
							}
						});
					},
					updateSettings: function(p_settings, done) {
						var PlayerSettings = require('./../index.js').getModels().player_settings,
							thisHash = this.getDataValue('hashField'),
							thisModel = this;

						PlayerSettings.findOne({where: {playerHash: thisHash}}).then(function(settings) {
							if (settings) {
								settings.update(p_settings).then(function(u_settings) {	return done(u_settings); });
							} else {
								thisModel.makeSettings(function(n_settings) { return done(n_settings); });
							}
						});
					},
					validateSecuritySettings: function(req, done) {
						this.getSettings(function(settings) {
							var API = require('./../../routes/api.js'),
								os = require("os"),
								requireMachineValidation = settings.requireMachineValidation,
								validMachines = settings.validMachines;

							var isAllowedMachine = requireMachineValidation ? (API.methods.findInArray(os.hostname().toUpperCase(), validMachines)[0]) : true;

							var securityCheck = (isAllowedMachine);

							return done(securityCheck);
						});
					}
				},
				freezeTableName: true
			}
		);

		PlayerModel.afterCreate(function(model, options) { return model.makeSettings(); });

		return PlayerModel;
	};

})();