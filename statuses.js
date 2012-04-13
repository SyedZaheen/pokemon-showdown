exports.BattleStatuses = {
	brn: {
		effectType: 'Status',
		onStart: function(target) {
			this.add('-status', target.id, 'brn');
		},
		onModifyStats: function(stats, pokemon) {
			if (pokemon.ability !== 'guts')
			{
				stats.atk /= 2;
			}
		},
		onResidualOrder: 9,
		onResidual: function(pokemon) {
			this.damage(pokemon.maxhp/8);
		}
	},
	par: {
		effectType: 'Status',
		onStart: function(target) {
			this.add('-status', target.id, 'par');
		},
		onModifyStats: function(stats, pokemon) {
			if (pokemon.ability !== 'quickfeet')
			{
				stats.spe /= 4;
			}
		},
		onBeforeMovePriority: 2,
		onBeforeMove: function(pokemon) {
			if (Math.random()*4 < 1)
			{
				this.add('cant', pokemon.id, 'par');
				return false;
			}
		}
	},
	slp: {
		effectType: 'Status',
		onStart: function(target) {
			this.add('-status', target.id, 'slp');
			// 1-3 turns
			this.effectData.startTime = 2+parseInt(Math.random()*3);
			this.effectData.time = this.effectData.startTime;
			if (target.getAbility().isHalfSleep)
			{
				this.effectData.time = Math.floor(this.effectData.time / 2);
			}
		},
		onSwitchIn: function(target) {
			this.effectData.time = this.effectData.startTime;
			if (target.getAbility().isHalfSleep)
			{
				this.effectData.time = Math.floor(this.effectData.time / 2);
			}
		},
		onBeforeMovePriority: 2,
		onBeforeMove: function(pokemon, target, move) {
			pokemon.statusData.time--;
			if (!pokemon.statusData.time)
			{
				this.add('-curestatus', pokemon.id, 'slp');
				pokemon.setStatus('');
				return;
			}
			this.add('cant', pokemon.id, 'slp');
			if (move.sleepUsable)
			{
				return;
			}
			return false;
		}
	},
	frz: {
		effectType: 'Status',
		onStart: function(target) {
			this.add('-status', target.id, 'frz');
		},
		onBeforeMovePriority: 2,
		onBeforeMove: function(pokemon, target, move) {
			if (Math.random()*5 < 1 || move.thawsUser)
			{
				this.add('-curestatus', pokemon.id, 'frz');
				pokemon.setStatus('');
				return;
			}
			this.add('cant', pokemon.id, 'frz');
			return false;
		},
		onHit: function(target, source, move) {
			if (move.type === 'Fire' || move.id === 'scald')
			{
				this.add('-curestatus', target.id, 'frz');
				target.setStatus('');
			}
		}
	},
	psn: {
		effectType: 'Status',
		onStart: function(target) {
			this.add('-status', target.id, 'psn');
		},
		onResidualOrder: 9,
		onResidual: function(pokemon) {
			this.damage(pokemon.maxhp/8);
		}
	},
	tox: {
		effectType: 'Status',
		onStart: function(target) {
			this.add('-status', target.id, 'tox');
			this.effectData.stage = 0;
		},
		onSwitchIn: function() {
			this.effectData.stage = 0;
		},
		onResidual: function(pokemon) {
			this.effectData.stage++;
			this.damage(pokemon.maxhp*this.effectData.stage/16);
		}
	},
	confusion: {
		// this is a volatile status
		noCopy: true, // doesn't get copied by Baton Pass
		onStart: function(target) {
			this.add('-start', target.id, 'confusion');
			this.effectData.time = 2 + parseInt(Math.random()*4);
		},
		onEnd: function(target) {
			this.add('-end', target.id, 'confusion');
		},
		onBeforeMove: function(pokemon) {
			pokemon.volatiles.confusion.time--;
			if (!pokemon.volatiles.confusion.time)
			{
				pokemon.removeVolatile('confusion');
				return;
			}
			this.add('-activate', pokemon.id, 'confusion');
			if (Math.random()*2 < 1)
			{
				return;
			}
			this.damage(this.getDamage(pokemon,pokemon,40));
			return false;
		}
	},
	flinch: {
		duration: 1,
		onBeforeMove: function(pokemon) {
			if (!this.runEvent('Flinch', pokemon))
			{
				return;
			}
			this.add('cant', pokemon, 'flinch');
			return false;
		}
	},
	trapped: {
		noCopy: true,
		onModifyPokemon: function(pokemon) {
			if (!this.effectData.source || !this.effectData.source.isActive)
			{
				delete pokemon.volatiles['trapped'];
				return;
			}
			pokemon.trapped = true;
		}
	},
	partiallytrapped: {
		duration: 5,
		durationCallback: function(target, source) {
			if (source.item === 'GripClaw') return 5;
			return Math.floor(4 + Math.random()*2);
		},
		onResidualOrder: 11,
		onResidual: function(pokemon) {
			if (this.effectData.source && !this.effectData.source.isActive)
			{
				pokemon.removeVolatile('partiallytrapped');
				return;
			}
			this.damage(pokemon.maxhp/16);
		},
		onEnd: function(pokemon) {
			this.add('-end', pokemon, this.effectData.sourceEffect.id, '[partiallytrapped]');
		},
		onModifyPokemon: function(pokemon) {
			pokemon.trapped = true;
		}
	},
	lockedmove: {
		// Outrage, Thrash, Petal Dance...
		durationCallback: function() {
			return 2 + parseInt(2*Math.random());
		},
		onResidual: function(target) {
			var move = this.getMove(target.lastMove);
			if (!move.self || move.self.volatileStatus !== 'lockedmove')
			{
				// don't lock, and bypass confusion for calming
				delete target.volatiles['lockedmove'];
			}
		},
		onEnd: function(target) {
			this.add('-end', target, 'rampage');
			target.addVolatile('confusion');
		},
		onModifyPokemon: function(pokemon) {
			pokemon.lockMove(pokemon.lastMove);
		},
		onBeforeTurn: function(pokemon) {
			var move = this.getMove(pokemon.lastMove);
			if (pokemon.lastMove)
			{
				this.debug('Forcing into '+pokemon.lastMove);
				this.changeDecision(pokemon, {move: pokemon.lastMove});
			}
		}
	},
	choicelock: {
		onStart: function(pokemon) {
			this.effectData.move = this.activeMove.id;
			if (!this.effectData.move) return false;
		},
		onModifyPokemon: function(pokemon) {
			if (!pokemon.hasMove(this.effectData.move))
			{
				return;
			}
			if (!pokemon.getItem().isChoice)
			{
				pokemon.removeVolatile('choicelock');
				return;
			}
			var moves = pokemon.moveset;
			for (var i=0; i<moves.length; i++)
			{
				if (moves[i].id !== this.effectData.move)
				{
					moves[i].disabled = true;
				}
			}
		}
	},
	mustrecharge: {
		duration: 2,
		onBeforeMove: function(pokemon) {
			this.add('cant', pokemon, 'recharge');
			return false;
		},
		onModifyPokemon: function(pokemon) {
			pokemon.lockMove('recharge');
		}
	},
	futuremove: {
		// this is a side condition
		onStart: function(side) {
			this.effectData.positions = [];
			for (var i=0; i<side.active.length; i++)
			{
				this.effectData.positions[i] = null;
			}
		},
		onResidualOrder: 3,
		onResidual: function(side) {
			var finished = true;
			for (var i=0; i<side.active.length; i++)
			{
				var posData = this.effectData.positions[i];
				if (!posData) continue;
				
				posData.duration--;
				
				if (posData.duration > 0)
				{
					finished = false;
					continue;
				}
				
				// time's up; time to hit! :D
				var target = side.foe.active[posData.targetPosition];
				var move = this.getMove(posData.move);
				if (target.fainted)
				{
					this.add('hint', ''+move.name+' did not hit because the target is fainted.');
					this.effectData.positions[i] = null;
					continue;
				}
				
				this.add('message '+move.name+' hit! (placeholder)');
				target.removeVolatile('Protect');
				target.removeVolatile('Endure');
				
				this.moveHit(target, posData.source, move, posData.moveData);
				
				this.effectData.positions[i] = null;
			}
			if (finished)
			{
				side.removeSideCondition('futuremove');
			}
		}
	},
	stall: {
		// Protect, Detect, Endure counter
		duration: 2,
		onStart: function() {
			this.effectData.counter = 1;
		},
		onRestart: function() {
			this.effectData.counter++;
			this.effectData.duration = 2;
		}
	},
	
	// weather
	
	// weather is implemented here since it's so important to the game
	
	raindance: {
		effectType: 'Weather',
		duration: 5,
		durationCallback: function(source, effect) {
			if (source && source.item === 'damprock')
			{
				return 8;
			}
			return 5;
		},
		onBasePower: function(basePower, attacker, defender, move) {
			if (move.type === 'Water')
			{
				this.debug('rain water boost');
				return basePower * 1.5;
			}
			if (move.type === 'Fire')
			{
				this.debug('rain fire suppress');
				return basePower * .5;
			}
		},
		onModifyMove: function(move) {
			if (move.id === 'thunder' || move.id === 'hurricane')
			{
				move.accuracy = true;
			}
			if (move.id === 'weatherball')
			{
				move.type = 'Water';
				move.basePower = 100;
			}
		},
		onStart: function(battle, source, effect) {
			if (effect && effect.effectType === 'Ability')
			{
				this.effectData.duration = 0;
				this.add('-weather', 'RainDance', '[from] ability: Drizzle', '[of] '+source);
			}
			else
			{
				this.add('-weather', 'RainDance');
			}
		},
		onResidualOrder: 1,
		onResidual: function() {
			this.add('-weather', 'RainDance', '[upkeep]');
			this.eachEvent('Weather');
		},
		onEnd: function() {
			this.add('-weather', 'none');
		}
	},
	sunnyday: {
		effectType: 'Weather',
		duration: 5,
		durationCallback: function(source, effect) {
			if (source && source.item === 'heatrock')
			{
				return 8;
			}
			return 5;
		},
		onBasePower: function(basePower, attacker, defender, move) {
			if (move.type === 'Fire')
			{
				this.debug('Sunny Day fire boost');
				return basePower * 1.5;
			}
			if (move.type === 'Water')
			{
				this.debug('Sunny Day water suppress');
				return basePower * .5;
			}
		},
		onModifyMove: function(move) {
			if (move.id === 'Thunder' || move.id === 'Hurricane')
			{
				move.accuracy = 50;
			}
			if (move.id === 'weatherball')
			{
				move.type = 'Fire';
				move.basePower = 100;
			}
		},
		onStart: function(battle, source, effect) {
			if (effect && effect.effectType === 'Ability')
			{
				this.effectData.duration = 0;
				this.add('-weather', 'SunnyDay', '[from] ability: Drought', '[of] '+source);
			}
			else
			{
				this.add('-weather', 'SunnyDay');
			}
		},
		onImmunity: function(type) {
			if (type === 'frz') return false;
		},
		onResidualOrder: 1,
		onResidual: function() {
			this.add('-weather', 'SunnyDay', '[upkeep]');
			this.eachEvent('Weather');
		},
		onEnd: function() {
			this.add('-weather', 'none');
		}
	},
	sandstorm: {
		effectType: 'Weather',
		duration: 5,
		durationCallback: function(source, effect) {
			if (source && source.item === 'smoothrock')
			{
				return 8;
			}
			return 5;
		},
		onModifyStats: function(stats, pokemon) {
			if (pokemon.hasType('Rock'))
			{
				stats.spd *= 3/2;
			}
		},
		onModifyMove: function(move) {
			if (move.id === 'weatherball')
			{
				move.type = 'Rock';
				move.basePower = 100;
			}
		},
		onStart: function(battle, source, effect) {
			if (effect && effect.effectType === 'Ability')
			{
				this.effectData.duration = 0;
				this.add('-weather', 'Sandstorm', '[from] ability: Sand Stream', '[of] '+source);
			}
			else
			{
				this.add('-weather', 'Sandstorm');
			}
		},
		onResidualOrder: 1,
		onResidual: function() {
			this.add('-weather', 'Sandstorm', '[upkeep]');
			this.eachEvent('Weather');
		},
		onWeather: function(target) {
			this.damage(target.maxhp/16);
		},
		onEnd: function() {
			this.add('-weather', 'none');
		}
	},
	hail: {
		effectType: 'Weather',
		duration: 5,
		durationCallback: function(source, effect) {
			if (source && source.item === 'icyrock')
			{
				return 8;
			}
			return 5;
		},
		onStart: function(battle, source, effect) {
			if (effect && effect.effectType === 'Ability')
			{
				this.effectData.duration = 0;
				this.add('-weather', 'Hail', '[from] ability: Snow Warning', '[of] '+source);
			}
			else
			{
				this.add('-weather', 'Hail');
			}
		},
		onModifyPokemon: function(move) {
			if (move.id === 'weatherball')
			{
				move.type = 'Ice';
				move.basePower = 100;
			}
		},
		onModifyMove: function(move) {
			if (move.id === 'blizzard')
			{
				move.accuracy = true;
			}
			if (move.id === 'weatherball')
			{
				move.type = 'Ice';
				move.basePower = 100;
			}
		},
		onResidualOrder: 1,
		onResidual: function() {
			this.add('-weather', 'Hail', '[upkeep]');
			this.eachEvent('Weather');
		},
		onWeather: function(target) {
			this.damage(target.maxhp/16);
		},
		onEnd: function() {
			this.add('-weather', 'none');
		}
	}
};