# ant-sim
Ant nest building simulation

![screenshot](https://github.com/Indy9000/ant-sim/blob/main/23-11.jpeg)

The short paper based on this simulation can be found [here](https://indy9000.blog)

The simulation consisted of  sand and ants as distinct situated objects that interacted with each other. It also contained a simulated static pheromone cloud that was emanating from the centre of the brood. On each cycle, object positions were updated according to their internal states, the external influences such as pheromone level detected, or collisions with other objects. 

We modelled three types of ants (Internal, External,Passive), each of them were configurable from a common template. Their behaviour was defined by the relative values of the parameters used.  Ants moved in a correlated random fashion. The range of movement of the ants was dependent on the pheromone level detected. Each type of an ant had a pheromone threshold level such that once the local pheromone level was below it, the ant traversed back in the direction of the location with last known highest pheromone level. Internal and external ants differed only by their carry direction and threshold levels, where it was higher for internal ants, such that they stayed close to the brood (cluster of Passive ants) and the  threshold level was lower for external ants, such that they roamed the neighbourhood. Internal ants carried sand outwards in the direction of decaying pheromone levels and External ants carried in the opposite direction.

Passive ants had a very high level of pheromone threshold and they clustered together in the middle of the nest.

Each ant had an inherent energy level. They expended the energy in moving, dragging objects and turning. We didn't model a specific energy acquisition model, such as seeking food, instead each ant in each simulation cycle got a parameterised amount of energy, to be expended on activities. When the energy level dropped below parameterised levels, ants were not able to perform activities, for example, walking, carrying etc.

Each ant had a variable speed. They could randomly speed up and slow down, turn a small angle or stop briefly. This formed a realistic movement model for ants.

Ants could detect collisions with other objects such as sand or other ants taking the body morphology into account. Ants' direction, speed and object carrying behaviours were affected accordingly as a result of a collision.

We also modelled a basic memory of the location of maximum pheromone location, and the ant was capable of navigating towards that direction.

All simulations were performed in an arena the size of 660 x 660 px and an ant was 
modelled as a 10 x 2 px rectangle. A sand granule was of the size 2 x 2 px. 
These dimensions were used in the *Controlling Ant-Based Construction* paper and in 
turn were given by Franks and Deneubourg (1997) \cite{4}. For all experiments (unless otherwise stated) we used a static pheromone template, which was a gaussian dispersion (mean of 0 and standard deviation of 100) of simulated pheromone, normalised to 1, situated at the centre of the arena emanating from the brood.

In general, simulation was done as described in pseudo code in the Listing 1. 
All objects in the simulation, such as ants, sand were situated objects in the simulated world. The basic algorithm worked for all situated objects, but polymorphism ensured each action was specialised for each derived object.

```
For each situated object,
	update state (in the case of an ant)
		check pheromone seek behaviour
			if current pheromone level is below threshold
				turn in the direction of detected max pheromone 
				level location
		 move in the 2D world
		 bounce off walls
		 	change speed
			change direction
		detect collisions
			If collided with an ant
				decide whether to drop carried sand
				change direction
			if collided with sand particle
				decide whether to drop carried sand
				change direction
				decide whether to pick up sand
					if picked up sand, 
						if internal ant
							change direction away from nest
						if external ant
							change direction towards nest
		move carried items
		replenish energy
	render ant to canvas
```

<small><b>Listing 1</b> : Simulation pseudo code</small>

We had implemented the simulation with an object oriented programming language called Typescript which cross compiled to Javascript. This made it possible for any browser to run the simulation without having to set up software or run a server.

A Typescript implementation (as.ts) and compiled Javascript (as.js) with HTML file 
(index.html)  that is runnable by loading HTML file in a web browser, are attached 
as supplemental material.  

