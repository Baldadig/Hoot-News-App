import AppKit
let dir=URL(fileURLWithPath:CommandLine.arguments[1]);var rows:[[String:Any]]=[]
let lut=(0...255).map{ i -> Double in let v=Double(i)/255;return v <= 0.04045 ? v/12.92 : pow((v+0.055)/1.055,2.4)}
for url in try FileManager.default.contentsOfDirectory(at:dir,includingPropertiesForKeys:nil).filter({$0.pathExtension=="png" && $0.lastPathComponent.hasPrefix("ios-")}) {
 guard let raw=NSBitmapImageRep(data:try Data(contentsOf:url))?.cgImage else {continue}
 let w=raw.width,h=raw.height;var data=[UInt8](repeating:0,count:w*h*4);var sum=0.0;var bright=0
 data.withUnsafeMutableBytes{ buf in
  guard let ctx=CGContext(data:buf.baseAddress,width:w,height:h,bitsPerComponent:8,bytesPerRow:w*4,space:CGColorSpace(name:CGColorSpace.sRGB)!,bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue) else {return}
  ctx.draw(raw,in:CGRect(x:0,y:0,width:w,height:h))
  for i in stride(from:0,to:buf.count,by:4) {let l=0.2126*lut[Int(buf[i])]+0.7152*lut[Int(buf[i+1])]+0.0722*lut[Int(buf[i+2])];sum += l;if l>0.7 {bright += 1}}
 }
 let n=Double(w*h);rows.append(["file":url.lastPathComponent,"pixels":[w,h],"meanLinearLuminance":sum/n,"fractionAbovePoint7":Double(bright)/n])
}
try JSONSerialization.data(withJSONObject:rows,options:[.prettyPrinted,.sortedKeys]).write(to:dir.appendingPathComponent("pixelmeting.json"));print("Gemeten: \(rows.count) renders")
