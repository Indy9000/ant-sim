//-----------------------------------------------------------------------------------------------
interface ISituatedObject {
    Id: number;
    X: number;
    Y: number;
    PreviousBinIndex: number;

    Update(width: number, height: number, binGrid: BinGrid, pheromoneMap: MultiDimArray);
    GetHeadPosition();
    GetDistanceFromPoint(x:number,y:number):number;
    Draw(ctx: CanvasRenderingContext2D);
}
//-----------------------------------------------------------------------------------------------
function Rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}
//-----------------------------------------------------------------------------------------------
function Clamp(min: number, max: number, val: number) {
    return (val <= min ? min : (val >= max ? max : val));
}
//-----------------------------------------------------------------------------------------------

function ToRadians(degrees: number) {
    return (Math.PI * degrees) / 180.0;
}
function ToDegrees(rads:number){
    return rads * 180.0/ Math.PI;
}
//-----------------------------------------------------------------------------------------------
function PolarToCartesian(r: number, theta: number/*In radians*/) {
    var x = r * Math.cos(theta);
    var y = r * Math.sin(theta);
    return [x,y];
}
function CartesianToPolar(x1,y1,x2,y2){
    var dx = x1 - x2;
    var dy = y1 - y2;
    var r = Math.sqrt(dx*dx+dy*dy);
    var theta = Math.atan2(dy, dx); //towords max pheromone point
    theta = theta < 0 ? (Math.PI*2.0 + theta) : theta;  //normalise negative angles
    return [r,theta];
}
function ComputeStats(arr: Array<number>) {
    var N = arr.length;
    if (N < 1)
        return [0, 0];

    var T = 0;
    for (var w = 0; w < N; w++) { T += arr[w] }
    var Mu = T / N;
    var S = 0;
    for (var w = 0; w < N; w++) { S += Math.pow(arr[w] - Mu, 2) }
    return [Mu, Math.sqrt(S / N)];
}
//-----------------------------------------------------------------------------------------------
class BinGrid {
    Bins: Array<Array<ISituatedObject>>;
    BinCount: number;
    ColCount: number;
    RowCount: number;
    constructor(public BinWidth: number, public BinHeight: number, public Width: number, public Height: number) {
        this.ColCount = Math.ceil(this.Width / this.BinWidth);
        this.RowCount = Math.ceil(this.Height / this.BinHeight);
        console.log('rows ' + this.RowCount + ' cols ' + this.ColCount);
        this.BinCount = this.ColCount * this.RowCount
        this.Bins = new Array<Array<ISituatedObject>>(this.BinCount);
        for (var i = 0; i < this.BinCount; i++) {
            this.Bins[i] = new Array<ISituatedObject>();
        }
    }

    public Audit(){
        //return the number of items
        var acc = 0;
        for(var r =0;r< this.RowCount;r++){
            for(var c=0;c<this.ColCount;c++){
                var i = r * this.ColCount + c;
                acc += this.Bins[i].length;
            }
        }    
        return acc;
    }
    
    public ReportSectorPerformance(centreX:number, centreY:number,framecount:number){
        var sectorDistances = new Array<Array<number>>(8);//8 sectors
        var sectorStoneCounts = new Array<number>(8);//8 sectors
        for(var ii=0;ii<8;ii++){
            sectorDistances[ii] = new Array<number>();
            sectorStoneCounts[ii]=0;
        }
        
        var allDistances = new Array<number>();
        
        var x = centreX; var y = centreY;
        for(var r =0;r< this.RowCount;r++){
            for(var c=0;c<this.ColCount;c++){
                var i = r * this.ColCount + c;
                for(var k of this.Bins[i]){
                    if(k instanceof Sand){
                        //compute polar from middle
                        var [dist,theta] = CartesianToPolar(k.X,k.Y,x,y);
                        
                        var jj = Math.floor(theta / (2.0 * Math.PI/8.0));//sector index
                        if(jj>7 || jj<0)
                        {
                            console.log('theta',theta, 'degrees', ToDegrees(theta));
                            throw 'OOOOOOOOB ' + jj;
                        }
                        allDistances.push(dist);    
                        sectorDistances[jj].push(dist);
                        sectorStoneCounts[jj]++; //total the stones in this sector
                    }
                }
            }
        }    
        
        //compute stats
        ///*/
        console.log('==========================================');
        console.log('Frame Count',framecount);
        console.log('Sector Stone Distance Stats (sectorId,mean,std dev)');
        for(var ii=0; ii<8; ii++){
            var [m1,sd1] = ComputeStats(sectorDistances[ii]);
            var count = sectorStoneCounts[ii];
            console.log(ii,count,m1,sd1);
        }
        console.log('Overall Stone Distance Stats (mean,std dev)');
        var [m2,sd2] = ComputeStats(allDistances);
        console.log(m2,sd2);
        console.log('Stone Count Stats over 8 Sectors (mean,std dev)');
        var [m3,sd3] = ComputeStats(sectorStoneCounts);
        console.log(m3,sd3);
        console.log('++++++++++++++++++++++++++++++++++++++++++');
        //*/
    }
    
    private GetRowColFromPosition(x: number, y: number) {
        var row = Math.min(this.RowCount, Math.max(0, Math.floor(y / this.BinHeight)));
        var col = Math.min(this.ColCount, Math.max(0, Math.floor(x / this.BinWidth)));
        //console.log('(' + x + ',' + y + ')' + '[' + row + ',' + col + ']');
        row = Clamp(0,this.RowCount-1,row);
        col = Clamp(0,this.ColCount-1,col);
        return [row,col];        
    }
    
    private GetBinIndexFromPosition(x: number, y: number) {
        var [row,col] = this.GetRowColFromPosition(x,y);        
        return row * this.ColCount + col;
    }

    public AddToBin(item: ISituatedObject) {
        var [x, y] = item.GetHeadPosition();
        var binIndex = this.GetBinIndexFromPosition(x, y);
        //console.log('binIndex ' + binIndex + '/'+this.BinCount +' (' + x + ',' + y + ')');
        //if (binIndex == item.PreviousBinIndex)
        //    return; //no change in the bin
        //if (binIndex >= this.BinCount)
        //    return; //outof bounds position, ignore
        //if (item.PreviousBinIndex != -1) {
        //    this.RemoveFromBin(item);
        //}
        //Add to the new bin
        try{
            this.Bins[binIndex].push(item);
            item.PreviousBinIndex = binIndex;
        }catch(e){
            var row = Math.min(this.RowCount, Math.max(0, Math.floor(y / this.BinHeight)));
            var col = Math.min(this.ColCount, Math.max(0, Math.floor(x / this.BinWidth)));
            console.log('************binIndex',binIndex+'/'+this.BinCount,'x=',x,'y=',y,'row=',row,'col=',col);                        
            throw e;
        }
    }

    public RemoveFromBin(item: ISituatedObject) {
        var i = this.Bins[item.PreviousBinIndex].indexOf(item, 0);
        if (i != undefined) {
            //console.log( 'binIndex ' + binIndex + ' prev= ' + 
            //                item.PreviousBinIndex + ' len = ' + (this.Bins[item.PreviousBinIndex].length))
            //console.log('Before Remove: bin Audit ', this.Audit());
            this.Bins[item.PreviousBinIndex].splice(i, 1);
            //console.log('prev ='+item.PreviousBinIndex+' removed from = ' + i + ' and added to ' +binIndex);
            //console.log('After Remove: bin Audit ', this.Audit());
        }
        else
            console.log('Item ' + item.Id + ' not found');
    }

    private GetDistance(x1: number, y1: number, x2: number, y2: number) {
        var dx = x1 - x2; var dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static DistanceThreshold = 1.5;
    public DetectCollision(ant: Ant) {
        var [x, y] = ant.GetHeadPosition();
        var items = this.GetNearbyObjects(x, y);
        //console.log('nearby items '+ items.length);
        for (var i of items) {
            if (i.Id == ant.Id)
                continue; //can't collide with itself
            var d = i.GetDistanceFromPoint(x,y);
            /*/
            if(d>=10)
            console.log('['+ ant.Id +']('+x+','+y+') nearby items ' + items.length +
                            ' id = ' + i.Id + '(' + i.X + ',' + i.Y + ') distance ' + d);
            //*/
            //console.log('[',x,y,']',i.Id,'dist',d);
            if (d < BinGrid.DistanceThreshold) {
                //console.log('++++++++++++++++++++');
                return i;
            }
        }
        //console.log('-----------------')
        return null; //no collisions
    }

    private GetItems(r:number,c:number){
        var row = Clamp(0,this.RowCount-1,r);
        var col = Clamp(0,this.ColCount-1,c);
        var binIndex = row * this.ColCount + col;
        return this.Bins[binIndex];
    }
    
    public GetNearbyObjects(x: number, y: number) {
        //get bin index
        //var binIndex = this.GetBinIndexFromPosition(x, y);
        var[row,col] = this.GetRowColFromPosition(x,y);
        
        var items =  this.GetItems(row,col).concat(
                     this.GetItems(row-1,col),  this.GetItems(row+1,col),
                     this.GetItems(row,col-1),  this.GetItems(row,col+1),
                     this.GetItems(row-1,col-1),this.GetItems(row-1,col+1),
                     this.GetItems(row+1,col-1),this.GetItems(row+1,col+1));
        
        if (items != undefined) {
            //if(items.length>0 && (x<335 && x>325))
            //    console.log('x ' + x + ' y '+ y + ' bin len ' + items.length);
            return items;
        }
        else
            return [];
    }
}
//-----------------------------------------------------------------------------------------------
class MultiDimArray {
    Data: Array<Array<number>>;
    constructor(public Rows: number, public Cols: number) {
        this.Data = new Array<Array<number>>(this.Rows);
        for (var r = 0; r < this.Rows; r++) {
            this.Data[r] = new Array<number>(this.Cols);
        }
    }
    public get(col: number, row: number) {
        try {
            var r = Clamp(0, this.Rows - 1, Math.round(row));
            var c = Clamp(0, this.Cols - 1, Math.round(col));

            return this.Data[r][c];
        } catch (e) {
            console.log('MDA get error (' + c + '/' + this.Cols + ',' + r + '/' + this.Rows + ')')
        }
    }
    public set(col: number, row: number, val: number) {
        try {
            var r = Math.round(row); var c = Math.round(col);
            this.Data[r][c] = val;
        } catch (e) {
            console.log('MDA set error (' + c + '/' + this.Cols + ',' + r + '/' + this.Rows + ')')
        }
    }
}
//-----------------------------------------------------------------------------------------------
var tpir = Math.sqrt(2.0 * Math.PI);
function gaussian(x:number, mu:number, sd:number) {
    var d2 = Math.pow(x - mu, 2.0);
    var s2 = Math.pow(sd, 2.0);
    var l = d2 / (2.0 * s2);
    return Math.exp(-l) / (sd * tpir) * sd * tpir;
}
//-----------------------------------------------------------------------------------------------
function dist(x1:number, y1:number, x2:number, y2:number) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}
//-----------------------------------------------------------------------------------------------
function float2color( val:number /*val 0 to 1 float*/) {
    var l = Math.floor(128 * val);
    var h = Number(l).toString(16);
    var color =  "#"+ "00"+h+"00";
    return color;
}    
//-----------------------------------------------------------------------------------------------
class Sand implements ISituatedObject {
    public X: number;
    public Y: number;
    public PreviousBinIndex: number;

    constructor(public Id: number, width: number, height: number) {
        this.X = Rand(0, width); this.Y = Rand(0, height);
        this.PreviousBinIndex = -1;
    }
    public Move() { }
    public GetHeadPosition() { 
        var x = this.X + AntSimulation.AntWidth;
        var y = this.Y + AntSimulation.AntHeight;
        return [x, y];
    }
    
    public Update(width: number, height: number, binGrid: BinGrid){}

    public Draw(ctx: CanvasRenderingContext2D) {
        //this.Update(width,height);
        var w = AntSimulation.SandWidth;
        var h = AntSimulation.SandHeight;
        ctx.save();
        //ctx.translate(this.X,this.Y);
        //ctx.rotate(this.Direction);
        //ctx.translate(-this.X,-this.Y);
        ctx.fillStyle = 'burlywood';
        ctx.fillRect(this.X, this.Y, w, h);
        ctx.restore();
    }

    //*/    
    public GetDistanceFromPoint(x1:number,y1:number){
        
        var x2 = this.X+AntSimulation.SandWidth/2; var y2 = this.Y+AntSimulation.SandHeight/2;
        
        var dx = x1 - x2; var dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /*/
    public GetDistanceFromPoint(x0:number,y0:number){
        var [x2,y2] = this.GetHeadPosition();
        var x1 = this.X; var y1 = this.Y;
        var d1 = (x2-x1) * (y1-y0);
        var d2 = (x1-x0) * (y2-y1);
        return Math.abs(d1-d2) / Math.sqrt(Math.pow((x2-x1),2) + Math.pow((y2-y1),2)); 
    }
    //*/
}
//-----------------------------------------------------------------------------------------------
class Pheromone implements ISituatedObject {
    public PreviousBinIndex: number;

    constructor(public Id: number, public X: number, public Y: number, public Strength: number) {
        this.PreviousBinIndex = -1;
    }

    public Update(width: number, height: number, binGrid: BinGrid) { }
    public Draw(ctx: CanvasRenderingContext2D) { }
    public GetHeadPosition() { return [this.X, this.Y]; }

    public GetDistanceFromPoint(x1:number,y1:number){
        var x2 = this.X; var y2 = this.Y;
        var dx = x1 - x2; var dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
//-----------------------------------------------------------------------------------------------
const enum AntKind { Internal, External, Passive }
//-----------------------------------------------------------------------------------------------
class Ant implements ISituatedObject {
    public X: number; //position
    public Y: number; //position
    public PreviousBinIndex: number;
    private PickedUpItems: Array<ISituatedObject> = new Array<ISituatedObject>();
    public Direction: number; //In radians
    
    private Speed: number; //value 0.001 to 1
    private MaxSpeed: number; //value 0.1 to 1
    private MaxMaxSpeed:number=2.0;
    private SpeedIncrement:number; 

    private AccumulatedPheromoneLevel: number = 1.0;
    private PheromoneDecay = 0.01;
     
    private PrevPheromoneLevelDetected: number = 0.0;
    private MaxPheromoneLevelDetected:number = 0.0;
    private MaxPheromoneLevelLocation:[number,number] =[0.0, 0.0];  
    private PheromoneSeekThreshold:number = 0.0;
    
    private MaxCarryCapacity = 5;
    private CarryOnItemMaxSpeedPenaltyDelta = 0.2;
    private CarryDirection = 0;
    
    private Energy: number = 1.0;
    private MaxEnergy:number = 1.0;
    private CarryLowEnergyThreshold: number = 0.1;
    private MoveLowEnergyThreshold: number = 0.01;
    private EnergyCostForMovement: number = 0.0005;
    private EnergyCostForTurn: number = 0.001;
    private EnergyCostForSpeedChange: number = 0.002;
    private EnergyCostDragItems: number = 0.09;
    private EnergyCostCollision: number = 0.05;
    private EnergyRebate: number = -0.05;
    
//-----------------------------------------------------------------------------------------------
    constructor(public Id: number, public Kind: AntKind, centerX: number, centerY: number) {
        this.PreviousBinIndex = -1;
        this.MaxSpeed = 2.0;
        switch (Kind) {
            case AntKind.External: 
                {   this.X = Rand(centerX - 310, centerY + 310); 
                    this.Y = Rand(centerX - 310, centerY + 310);
                    this.Energy = 0.5;
                    this.MaxEnergy = 0.5;
                    this.EnergyRebate = -0.05;
                    this.PheromoneDecay = 0.1;
                    this.PheromoneSeekThreshold = 0.0;//0.0001;
                    this.Speed = Rand(0, 2); 
                    this.SpeedIncrement = 2;
                    this.CarryDirection = 0;//towards brood
                } break;
            case AntKind.Internal: 
                {   this.X = Rand(centerX - 50, centerY + 50); 
                    this.Y = Rand(centerX - 50, centerY + 50);
                    this.Energy = 0.5;
                    this.MaxEnergy = 0.5;
                    this.EnergyRebate = -0.05;
                    this.PheromoneDecay = 0.001;
                    this.PheromoneSeekThreshold = 0.5; //******
                    this.Speed = Rand(0, 2);
                    this.SpeedIncrement = 2;
                    this.CarryDirection = Math.PI; //away from brood 
                } break;
            case AntKind.Passive: 
                {   this.X = Rand(centerX - 15, centerY + 15); 
                    this.Y = Rand(centerX - 15, centerY + 15);
                    this.Energy = 0.3;
                    this.MaxEnergy = 0.5;
                    this.EnergyRebate = -0.0125;
                    this.PheromoneDecay = 0.50;
                    this.PheromoneSeekThreshold = 0.9;
                    this.Speed = Rand(0, 0.005);
                    this.SpeedIncrement = 0.001; 
                } break;
        }

        this.Direction = ToRadians(Rand(0, 360));
        
    }

    public GetHeadPosition() {
        var x = this.X + AntSimulation.AntWidth * Math.cos(this.Direction);
        var y = this.Y + AntSimulation.AntHeight * Math.cos(this.Direction);
        return [x, y];
    }
    
    public GetDistanceFromPoint(x0:number,y0:number):number{
        var [x2,y2] = this.GetHeadPosition();
        var x1 = this.X; var y1 = this.Y;
        var d1 = (x2-x1) * (y1-y0);
        var d2 = (x1-x0) * (y2-y1);
        var d3 = (x2-x1);
        var d4 = (y2-y1);
        return Math.abs(d1-d2) / Math.sqrt(d3*d3 + d4*d4); 
    }
//-----------------------------------------------------------------------------------------------    
    private TaxEnergy(delta: number) {
        this.Energy = Clamp(0.0001, this.MaxEnergy, this.Energy - delta); //dir change costs energy
    }
//-----------------------------------------------------------------------------------------------    
    private SetDirection(rad: number) {
        this.Direction = rad
        this.TaxEnergy(this.EnergyCostForTurn);
        //console.log('Energy=' + this.Energy);
    }
//-----------------------------------------------------------------------------------------------
    private SetSpeed(speed: number) {
        this.Speed = Clamp(0.001, this.MaxSpeed, speed);
        this.TaxEnergy(this.EnergyCostForSpeedChange);
        //console.log('Energy=' + this.Energy);
    }
//-----------------------------------------------------------------------------------------------
    private Move(binGrid: BinGrid) {

        //if low on energy drop items
        if(this.Energy< this.MoveLowEnergyThreshold && this.PickedUpItems.length>0){
            this.DropItems(binGrid);
        }
        
        var p1 = Rand(0, 1); //probability of a turn
        var p2 = Rand(0, 1); //probability of jitter
        var p3 = Rand(0, 1); //probability of speed change
        var angle = 0.0;
        if (p1 < 0.2 && this.PickedUpItems.length == 0)
        //if (p1 < 0.2)
            angle += Rand(-140, 140); //random turn
        if (p2 < 0.2)
            angle += Rand(-5, 5); // random jitter
        
        //*/ 
        //NOTE: Disable this if PheromoneSeekBehaviourAlgo2 is used
        if (angle > 0.0 && this.Energy > this.MoveLowEnergyThreshold) {
            angle = angle * 0.1; //apply scaling
            this.SetDirection(this.Direction + ToRadians(angle));
        }
        //*/
        
        if (p3 < 0.2 && this.Energy > this.MoveLowEnergyThreshold) {
            this.SetSpeed(this.Speed + Rand(-this.SpeedIncrement, this.SpeedIncrement));
        }

        var [vx,vy] = PolarToCartesian(this.Speed, this.Direction);
        var prevX = this.X;
        var prevY = this.Y;
        this.X += vx;
        this.Y += vy;

        if (prevX != this.X || prevY != this.Y) {
            this.TaxEnergy(this.EnergyCostForMovement);
            return true;
        } //return true if changed position
        else
            return false;
        //console.log(vel.x, vel.y);    
    }
//-----------------------------------------------------------------------------------------------
    //Homing based on PheromoneSeekThreshold
    private PheromoneSeekBehaviourAlgo1(pheromoneMap: MultiDimArray) {
        var [x, y] = this.GetHeadPosition();
        var level = pheromoneMap.get(x, y)
        this.PrevPheromoneLevelDetected = level;
        
        if(this.MaxPheromoneLevelDetected < level){
            this.MaxPheromoneLevelDetected = level;
            this.MaxPheromoneLevelLocation = [x,y];
        }
        else {
            var p1 = Rand(0, 1);
            if (this.PheromoneSeekThreshold>level && this.Energy > this.MoveLowEnergyThreshold) {
                //set off toward max pheromone loc, when below threshold
                var dx = this.MaxPheromoneLevelLocation[0] - x;
                var dy = this.MaxPheromoneLevelLocation[1] - y;
                var theta = Math.atan2(dy, dx);
                this.SetDirection(theta);
                //console.log('pheromone seekProb=',seekProbability,'pherAccum=',this.AccumulatedPheromoneLevel,'prevLevel=',this.PrevPheromoneLevelDetected);
                //console.log('level',level,'seek thresh',this.PheromoneSeekThreshold);
            }
        }
    }
    
    //Homing based on AccumulatedPheromoneLevel
    private PheromoneSeekBehaviourAlgo2(pheromoneMap: MultiDimArray) {
        var [x, y] = this.GetHeadPosition();
        var level = pheromoneMap.get(x, y)
        this.PrevPheromoneLevelDetected = level;
        
        var p1 = Rand(0, 1);
        var seekProbability = 1 / this.AccumulatedPheromoneLevel;
        if (p1 < seekProbability && this.Energy > this.MoveLowEnergyThreshold) {
            //look for higher level of pheromone
            //TODO try a few angles to see if the pheromone level is higher, if so take it
            for (var i = 0; i < 5; i++) {
                if (this.PrevPheromoneLevelDetected < level) { //take the first one that is higher
                    //console.log('pheromone found better! prev=',this.PrevPheromoneLevelDetected,'level=',level);
                    this.AccumulatedPheromoneLevel += level;
                    break;
                }
                var angle = Rand(-10, 10);
                this.SetDirection(this.Direction + ToRadians(angle));
                var [x, y] = this.GetHeadPosition();
                level = pheromoneMap.get(x, y)
            }
            //console.log('pheromone seekProb=',seekProbability,'pherAccum=',this.AccumulatedPheromoneLevel,'prevLevel=',this.PrevPheromoneLevelDetected);
        }
            
        this.AccumulatedPheromoneLevel = Clamp(1.0, 100, this.AccumulatedPheromoneLevel - this.PheromoneDecay);
    }
    
    private PheromoneSeekBehaviour(pheromoneMap: MultiDimArray) {
        this.PheromoneSeekBehaviourAlgo1(pheromoneMap);
    }
    
//-----------------------------------------------------------------------------------------------
    private DropItems(binGrid: BinGrid):boolean {
        var li = this.PickedUpItems.length;
        if (li > 0) {//have picked up items
            var p1 = Rand(0, 1);
            // if(p1< 0.2)
            //     return false;// randomly not drop
                
            //var dropOffPropensity = (1 - 1 / (1 + this.PickedUpItems.length)) * 0.3;
            //if (p1 < dropOffPropensity || this.Energy < this.CarryLowEnergyThreshold) {
            if(this.Energy < this.CarryLowEnergyThreshold){
                //---------------------------
                //drop the picked up objects
                //add the items back into the binGrid
                for(var pi of this.PickedUpItems){
                    binGrid.AddToBin(pi);
                }
                //remove items from the list
                this.PickedUpItems.splice(0, li);//remove all the items from the list
                //---------------------------
                this.MaxSpeed += (this.CarryOnItemMaxSpeedPenaltyDelta * li); //increase max speed whent he burden is lifted
                this.MaxSpeed = Clamp(0.1, this.MaxMaxSpeed, this.MaxSpeed);
                //console.log('dropped',li,'items. p=',p1+'/'+dropOffPropensity,'energy=',this.Energy+'/'+this.CarryLowEnergyThreshold,'MaxSpeed=',this.MaxSpeed);
                return true;
            }
        }
        return false;
    }
//-----------------------------------------------------------------------------------------------
    private PickupItems(binGrid: BinGrid, sand: ISituatedObject): boolean {
        var p1 = Rand(0, 1); //pickup probability
        var puiCount = this.PickedUpItems.length;
        var pickUpPropensity = 1 / (1 + puiCount);
        
        if (puiCount< this.MaxCarryCapacity && 
            p1 < pickUpPropensity && 
            this.Energy > this.CarryLowEnergyThreshold) {
            //sand picked up,
            //remove from the bin 
            binGrid.RemoveFromBin(sand);
            //add to the pickedup items
            this.PickedUpItems.push(sand);
            
            this.MaxSpeed -= this.CarryOnItemMaxSpeedPenaltyDelta; //each picked up item reduces the max speed
            this.MaxSpeed = Clamp(0.1, this.MaxMaxSpeed, this.MaxSpeed); //not let it fall below 0.1
            
            //console.log('sand',sand.Id,'picked up p1=',p1+'/'+pickUpPropensity,'Energy=',this.Energy+'/'+this.CarryLowEnergyThreshold,'MaxSpeed=',this.MaxSpeed);
            return true;
        }
        return false;
    }
//-----------------------------------------------------------------------------------------------
    private DragPickedupItems() {
        //move the picked up items
        var [x1,y1] = this.GetHeadPosition();
        //var x1 = this.X; var y1 = this.Y;
        
        for (var pi of this.PickedUpItems) {
            var fan1 = Rand(-0.5, 0.5);
            var fan2 = Rand(-0.5, 0.5);
            pi.X = x1 + fan1; pi.Y = y1 + fan2;
            //fan += 0.2;
            //console.log('moved '+pi.Id);
            this.TaxEnergy(this.EnergyCostDragItems);
        }
    }
//-----------------------------------------------------------------------------------------------    
    //******
    private PickupSand(sand:ISituatedObject, binGrid: BinGrid,pheromoneMap: MultiDimArray){
        if (this.PickupItems(binGrid, sand)) {
            //compute max pheromone position
            var [x, y] = this.GetHeadPosition(); 
            var dx = this.MaxPheromoneLevelLocation[0] - x;
            var dy = this.MaxPheromoneLevelLocation[1] - y;
            var theta = Math.atan2(dy, dx); //towords max pheromone point
            
            var angle = theta + this.CarryDirection;
            //this.SetDirection(this.Direction + ToRadians(angle));
            this.SetDirection(angle);
        }else{//if not picked up change dir slightly
            var angle = Rand(-5,5);
            this.SetDirection(this.Direction + ToRadians(angle));
        }
    }

    private DropSand(binGrid: BinGrid,pheromoneMap: MultiDimArray){
        //Only External ants may drop on collision
        if(this.DropItems(binGrid)){
            var angle = Rand(-140, 140);
            this.SetDirection(this.Direction + ToRadians(angle));
            return true;
        }
        return false;
    }
//-----------------------------------------------------------------------------------------------    
    private DetectCollision(binGrid: BinGrid, pheromoneMap:MultiDimArray){
        var collidedObj = binGrid.DetectCollision(this)
        if (collidedObj != null) {//collided
            this.TaxEnergy(this.EnergyCostCollision);
            //check if the collided object is an ant or sand
            if (collidedObj instanceof Ant) {
                if (!this.DropSand(binGrid,pheromoneMap)){
                    //if ant, reduce speed to 0 and change dir slightly
                    var angle = Rand(-15, 15);
                    //this.SetSpeed(0.0);
                    this.SetDirection(this.Direction + ToRadians(angle));
                }
                var ant = collidedObj; 
                //if(this.Kind == AntKind.External)
                //    console.log('Ant of ',this.Kind, ' kind, collided with an ant '+ ant.Id,'Kind', ant.Kind);
            }
            else if (collidedObj instanceof Sand) {
                //if sand, reduce speed to 0 and decide whether to pick up
                //this.SetSpeed(0.0);
                var sand = collidedObj;
                //console.log(this.Id,'collided with sand '+sand.Id);
                //**********
                
                if(!this.DropSand(binGrid,pheromoneMap)){
                    var angle = Rand(-5,5);//this governs if sand gets piled up or spread
                    this.SetDirection(this.Direction + ToRadians(angle));
                }
                this.PickupSand(sand, binGrid, pheromoneMap)
            }
        }
        else{
            //internal ants can drop without being collided
            //**********
            this.DropSand(binGrid,pheromoneMap);
        }
    }
//-----------------------------------------------------------------------------------------------    
    public Update(width: number, height: number, binGrid: BinGrid, pheromoneMap: MultiDimArray) {
        this.PheromoneSeekBehaviour(pheromoneMap);

        var changed = this.Move(binGrid);

        //Keep the ant within walls
        var prevX = this.X;
        var prevY = this.Y;
        var [x, y] = this.GetHeadPosition()
        var [vx, vy, speed, dir] = AntSimulation.BounceOffWalls(x, y, this.Speed, this.Direction, width, height)
        this.X += vx; this.Y += vy;
        this.SetSpeed(speed);
        this.SetDirection(dir);

        //this.DropCarryOnItems(binGrid);    
        
        this.DetectCollision(binGrid, pheromoneMap);
        
        this.DragPickedupItems();

        this.TaxEnergy(this.EnergyRebate); //Every cycle, ant gets some energy back
        //console.log('Energy='+this.Energy);
        if(prevX != this.X || prevY != this.Y || changed){
            binGrid.RemoveFromBin(this); //remove from prev bin
            binGrid.AddToBin(this);//add to new bin
        }
    }
//-----------------------------------------------------------------------------------------------
    public Draw(ctx: CanvasRenderingContext2D) {
        var c = 'black';
        switch (this.Kind) {
            case AntKind.Internal: c = 'red'; break;
            case AntKind.External: c = 'white'; break;
            case AntKind.Passive: c = 'blue'; break;
        }
    
        //balanced direction so that angles larger than 180 in either direction doesn't rotate too much
        if (this.Direction > Math.PI) {
            this.Direction += -(Math.PI * 2.0);
        } else if (this.Direction < -Math.PI) {
            this.Direction += (Math.PI * 2.0);
        }

        var w = AntSimulation.AntWidth;
        var h = AntSimulation.AntHeight;
        ctx.save();
        ctx.translate(this.X, this.Y);
        ctx.rotate(this.Direction);
        ctx.translate(-this.X, -this.Y);
        ctx.fillStyle = c;
        ctx.fillRect(this.X, this.Y, w, h);
        ctx.restore();
    }
}//Ant Class

//-----------------------------------------------------------------------------------------------
class AntSimulation {
    SituatedObjects: Array<ISituatedObject> = new Array<ISituatedObject>();
    PheromoneMap: MultiDimArray;
    Bingrid: BinGrid;

    static AntWidth = 10.0; static AntHeight = 2;
    static SandWidth = 2.0; static SandHeight = 2.0;
    constructor(public Width: number, public Height: number) {
        var id = 1000;
        this.Bingrid = new BinGrid(10, 10, this.Width, this.Height); //for collision det
        //Sands
        //*/
        for (var i = 0; i < 6000; i++) {
            this.SituatedObjects.push(new Sand(id++, Width, Height));
        }
        /*/
        //DEBUG
        //for(var i=0;i<660;i++){
        //    var s = new Sand(id++,Width,Height);
        //    s.X =Width/2; s.Y = i;
        //    this.SituatedObjects.push(s);
        //}
        //*/
        
        //Ants
        for (var i = 0; i < 30; i++)
            this.SituatedObjects.push(new Ant(id++,AntKind.Internal,Width/2,Height/2));
        for (var i = 0; i < 20; i++)            
            this.SituatedObjects.push(new Ant(id++,AntKind.External,Width/2,Height/2));
        for (var i = 0; i < 50; i++)
            this.SituatedObjects.push(new Ant(id++,AntKind.Passive,Width/2,Height/2));
        
        //initialize the bin grid
        this.Bingrid = new BinGrid(10, 10, this.Width, this.Height); //for collision det
        for (var so of this.SituatedObjects) {
            this.Bingrid.AddToBin(so);//add to new bin if changed
        }
        
        console.log('binGrid audit ' + this.Bingrid.Audit());
            
        //pheromone map initialisation
        this.ComputePheromoneCloud_Normal()
        //this.ComputePheromoneCloud_Heart();
        //this.ComputePheromoneCloud_Square();
        //this.ComputePheromoneCloud_Oval();
    }
    
    private ComputePheromoneCloud_Normal(){
        this.PheromoneMap = new MultiDimArray(this.Width, this.Height);
        var midX = this.Width / 2; var midY = this.Height / 2;
        var cloudDispersion = 100;
        for (var y = 0; y < this.Height; y++) {
            for (var x = 0; x < this.Width; x++) {
                var d1 = dist(x, y, midX, midY);
                var h1 = gaussian(d1, 0, cloudDispersion);
                this.PheromoneMap.set(x, y, h1);
            }
        }
    }
    
    private ComputePheromoneCloud_Square(){
        this.PheromoneMap = new MultiDimArray(this.Width, this.Height);
        var midX = this.Width / 2; var midY = this.Height / 2;
        var midX1 = midX - 75; var midX2 = midX + 75;
        var midY1 = midY - 75; var midY2 = midY + 75;
        var cloudDispersion = 75;
        for (var y = 0; y < this.Height; y++) {
            for (var x = 0; x < this.Width; x++) {
                var d1 = dist(x, y, midX1, midY1);
                var d2 = dist(x, y, midX2, midY1);
                var d3 = dist(x, y, midX1, midY2);
                var d4 = dist(x, y, midX2, midY2);
                
                var h1 = gaussian(d1, 0, cloudDispersion);
                var h2 = gaussian(d2, 0, cloudDispersion);
                var h3 = gaussian(d3, 0, cloudDispersion);
                var h4 = gaussian(d4, 0, cloudDispersion);
                
                this.PheromoneMap.set(x, y, (h1+h2+h3+h4));
            }
        }
    }
    
    private ComputePheromoneCloud_Oval(){
        this.PheromoneMap = new MultiDimArray(this.Width, this.Height);
        var midX = this.Width / 2; var midY = this.Height / 2;
        var midX1 = midX - 75; var midX2 = midX + 75;
        var cloudDispersion = 75;
        for (var y = 0; y < this.Height; y++) {
            for (var x = 0; x < this.Width; x++) {
                var d1 = dist(x, y, midX1, midY);
                var d2 = dist(x, y, midX2, midY);
                var h1 = gaussian(d1, 0, cloudDispersion);
                var h2 = gaussian(d2, 0, cloudDispersion);
                this.PheromoneMap.set(x, y, (h1+h2));
            }
        }
    }
    private ComputePheromoneCloud_Heart(){
        this.PheromoneMap = new MultiDimArray(this.Width, this.Height);
        var midX = this.Width / 2; var midY = this.Height / 2;
        var midX1 = midX - 75; var midX2 = midX + 75;
        var midY1 = midY - 45; var midY2 = midY + 45;
        var cloudDispersion = 50;
        for (var y = 0; y < this.Height; y++) {
            for (var x = 0; x < this.Width; x++) {
                var d1 = dist(x, y, midX1, midY1);
                var d2 = dist(x, y, midX2, midY1);
                var d3 = dist(x, y, midX, midY2);
                var h1 = gaussian(d1, 0, cloudDispersion);
                var h2 = gaussian(d2, 0, cloudDispersion);
                var h3 = gaussian(d3, 0, cloudDispersion);
                this.PheromoneMap.set(x, y, (h1+h2+h3/3));
            }
        }
    }
//-----------------------------------------------------------------------------------------------
    public static BounceOffWalls(x: number, y: number, speed: number, direction: number, width, height) {
        var [vx,vy] = PolarToCartesian(speed, direction);
        var VX = (x <= 0 || x >= width)  ? -vx : vx;
        var VY = (y <= 0 || y >= height) ? -vy : vy;
    
        //TODO if bounced, reduced speed by a fraction
        //var speed = Math.sqrt(VX*VX + VY*VY);
        var theta = Math.atan2(VY, VX); //cartesian to polar (only the angle)
        return [VX, VY, speed, theta];
    }
//-----------------------------------------------------------------------------------------------    
    private CachedCanvas:CanvasRenderingContext2D;
    
    public InitRender(ctx: CanvasRenderingContext2D) {
        for(var y=0;y<this.Height;y++){
            for(var x=0;x<this.Width;x++){
                var h = this.PheromoneMap.get(x,y);
                ctx.fillStyle = float2color(h);
                ctx.fillRect(x,y,1,1);
            }
        }
        this.CachedCanvas = ctx;
    }
//-----------------------------------------------------------------------------------------------    
    private FrameCounter:number=0;
    public Render(ctx: CanvasRenderingContext2D,canvas:HTMLCanvasElement) {
        ctx.save();
        ctx.clearRect(0,0,this.Width,this.Height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(this.CachedCanvas.canvas, 0, 0);
        //this.InitRender(ctx);

        for (var so of this.SituatedObjects) {
            so.Update(this.Width, this.Height, this.Bingrid, this.PheromoneMap);
                
            so.Draw(ctx);
        }

        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(' '+this.FrameCounter,20,20);
    
        //console.log(Date.now())
        var ev = 10000;
        if(this.FrameCounter % ev == 0){ 
            //save canvas
            //*/
            var list = document.getElementById('screenshots');
            var entry = document.createElement('li');
            var img = document.createElement('img');
            img.setAttribute('src',canvas.toDataURL('image/jpeg'));
            img.setAttribute('width','330');
            img.setAttribute('height','330');
            entry.appendChild(img);
            list.appendChild(entry);
            console.log('saving canvas');
            //*/
            var c = this.Bingrid.Audit();
            console.log('binGrid audit ' + c);
            this.Bingrid.ReportSectorPerformance(this.Width/2, this.Height/2,this.FrameCounter);
            //if(c<4990)
            //    throw "Something fisshy";
        }
        
        this.FrameCounter+=1;
        ctx.restore();
    }
}
//-----------------------------------------------------------------------------------------------

function exec() {
    var canv = document.createElement("canvas");

    var canvasTemp = document.createElement("canvas");
    
    
    var CanvasWidth = 660; var CanvasHeight = 660;
    canv.width = canvasTemp.width = CanvasWidth;
    canv.height = canvasTemp.height = CanvasHeight;
    document.body.appendChild(canv);
    var ctx = canv.getContext("2d");
    var tctx = canvasTemp.getContext("2d");
    var antsim = new AntSimulation(CanvasWidth, CanvasHeight);
    antsim.InitRender(tctx); // cached rendering done here
    //return antsim.render(defaultScene(), ctx, CanvasWidth, CanvasHeight);
    setInterval(() => antsim.Render(ctx,canv), 40);
}
//-----------------------------------------------------------------------------------------------
exec();