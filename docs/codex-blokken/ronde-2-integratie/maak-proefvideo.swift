import Foundation
import AVFoundation
import CoreVideo
let url=URL(fileURLWithPath:CommandLine.arguments[1])
let writer=try AVAssetWriter(outputURL:url,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:640,AVVideoHeightKey:360])
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA,kCVPixelBufferWidthKey as String:640,kCVPixelBufferHeightKey as String:360])
writer.add(input);guard writer.startWriting()else{fatalError("Writer niet gestart")};writer.startSession(atSourceTime:.zero)
for frame in 0..<90 {
 while !input.isReadyForMoreMediaData {Thread.sleep(forTimeInterval:0.005)}
 var pixel:CVPixelBuffer?;CVPixelBufferCreate(nil,640,360,kCVPixelFormatType_32BGRA,nil,&pixel);let p=pixel!
 CVPixelBufferLockBaseAddress(p,[]);let ptr=CVPixelBufferGetBaseAddress(p)!.assumingMemoryBound(to:UInt8.self),stride=CVPixelBufferGetBytesPerRow(p)
 for y in 0..<360 {for x in 0..<640 {let i=y*stride+x*4;let light=(x>40&&x<80+frame*4&&y>140&&y<220);ptr[i]=light ? 0xe8:0x1b;ptr[i+1]=light ? 0xf1:0x20;ptr[i+2]=light ? 0xf5:0xa3;ptr[i+3]=255}}
 CVPixelBufferUnlockBaseAddress(p,[]);guard adaptor.append(p,withPresentationTime:CMTime(value:Int64(frame),timescale:30))else{fatalError("Frame mislukt")}
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait();guard writer.status == .completed else {fatalError("Video niet klaar")};print("Stille H264-proefvideo gemaakt")
