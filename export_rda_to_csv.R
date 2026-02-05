files <- Sys.glob("baselinenowcast/data/*.rda")
out_dir <- "baselinenowcast/data"

for (f in files) {
  env <- new.env()
  objs <- load(f, envir = env)
  for (o in objs) {
    obj <- env[[o]]
    out <- file.path(out_dir, paste0(tools::file_path_sans_ext(basename(f)), "_", o, ".csv"))
    if (is.data.frame(obj)) {
      write.csv(obj, out, row.names = FALSE)
    } else if (is.matrix(obj)) {
      write.csv(obj, out, row.names = TRUE)
    }
  }
}
